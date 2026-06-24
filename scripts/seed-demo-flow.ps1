param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminEmail = "admin@swiftdrop.com",
    [Parameter(Mandatory = $true)]
    [SecureString]$AdminPassword,
    [string]$CustomerEmail = "customer.demo@swiftdrop.com",
    [Parameter(Mandatory = $true)]
    [SecureString]$CustomerPassword,
    [string]$MerchantEmail = "merchant.demo@swiftdrop.com",
    [string]$CourierEmail = "courier.demo@swiftdrop.com",
    [Parameter(Mandatory = $true)]
    [SecureString]$NewMerchantPassword,
    [Parameter(Mandatory = $true)]
    [SecureString]$NewCourierPassword
)

$ErrorActionPreference = "Stop"

function ConvertFrom-SecurePassword {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [SecureString]$SecurePassword
    )

    $credential = [PSCredential]::new("unused", $SecurePassword)
    return $credential.GetNetworkCredential().Password
}

function Invoke-Json {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Body = $null,
        [string]$AccessToken = $null
    )

    $headers = @{}
    if ($AccessToken) {
        $headers.Authorization = "Bearer $AccessToken"
    }

    $params = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        Headers = $headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }

    Invoke-RestMethod @params
}

function Connect-DemoAccount {
    param(
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][SecureString]$Password
    )

    $plainText = ConvertFrom-SecurePassword -SecurePassword $Password
    try {
        Invoke-Json -Method "POST" -Path "/api/v1/auth/login" -Body @{
            email = $Email
            password = $plainText
        }
    }
    finally {
        $plainText = $null
    }
}

function Set-DemoAccountPassword {
    param(
        [Parameter(Mandatory = $true)][string]$AccessToken,
        [Parameter(Mandatory = $true)][SecureString]$CurrentPassword,
        [Parameter(Mandatory = $true)][SecureString]$NewPassword
    )

    $currentPlainText = ConvertFrom-SecurePassword -SecurePassword $CurrentPassword
    $newPlainText = ConvertFrom-SecurePassword -SecurePassword $NewPassword
    try {
        Invoke-Json -Method "POST" -Path "/api/v1/auth/change-password" -AccessToken $AccessToken -Body @{
            currentPassword = $currentPlainText
            newPassword = $newPlainText
        }
    }
    finally {
        $currentPlainText = $null
        $newPlainText = $null
    }
}

Write-Host "Seeding SwiftDrop local demo flow through API at $BaseUrl"

$customerPlainText = ConvertFrom-SecurePassword -SecurePassword $CustomerPassword
try {
    Invoke-Json -Method "POST" -Path "/api/v1/auth/register" -Body @{
        email = $CustomerEmail
        password = $customerPlainText
    } | Out-Null
}
finally {
    $customerPlainText = $null
}

$merchantApplication = Invoke-Json -Method "POST" -Path "/api/v1/applications/merchant" -Body @{
    businessName = "Kadikoy Burger"
    contactEmail = $MerchantEmail
    message = "Local demo merchant application"
}

$courierApplication = Invoke-Json -Method "POST" -Path "/api/v1/applications/courier" -Body @{
    fullName = "Ahmet Yilmaz"
    contactEmail = $CourierEmail
    vehicleType = "MOTORBIKE"
    message = "Local demo courier application"
}

$admin = Connect-DemoAccount -Email $AdminEmail -Password $AdminPassword
$adminToken = $admin.accessToken

$merchantReview = Invoke-Json -Method "POST" -Path "/api/v1/admin/applications/merchants/$($merchantApplication.id)/approve" -AccessToken $adminToken -Body @{
    reviewNote = "Approved for local demo seed"
}

$courierReview = Invoke-Json -Method "POST" -Path "/api/v1/admin/applications/couriers/$($courierApplication.id)/approve" -AccessToken $adminToken -Body @{
    reviewNote = "Approved for local demo seed"
}

$merchantTempPlainText = $merchantReview.provisionedAccount.temporaryPassword
$merchantTempPassword = ConvertTo-SecureString $merchantTempPlainText -AsPlainText -Force
$merchantTempPlainText = $null
$merchantLogin = Connect-DemoAccount -Email $MerchantEmail -Password $merchantTempPassword
$merchantSession = Set-DemoAccountPassword -AccessToken $merchantLogin.accessToken -CurrentPassword $merchantTempPassword -NewPassword $NewMerchantPassword
$merchantTempPassword = $null
$merchantToken = $merchantSession.accessToken
$merchantProfile = Invoke-Json -Method "GET" -Path "/api/v1/merchant/profile" -AccessToken $merchantToken

$courierTempPlainText = $courierReview.provisionedAccount.temporaryPassword
$courierTempPassword = ConvertTo-SecureString $courierTempPlainText -AsPlainText -Force
$courierTempPlainText = $null
$courierLogin = Connect-DemoAccount -Email $CourierEmail -Password $courierTempPassword
$courierSession = Set-DemoAccountPassword -AccessToken $courierLogin.accessToken -CurrentPassword $courierTempPassword -NewPassword $NewCourierPassword
$courierTempPassword = $null
$courierToken = $courierSession.accessToken

$courierProfile = Invoke-Json -Method "GET" -Path "/api/v1/courier/profile" -AccessToken $courierToken
Invoke-Json -Method "POST" -Path "/api/v1/courier/availability" -AccessToken $courierToken -Body @{
    status = "AVAILABLE"
} | Out-Null

Invoke-Json -Method "POST" -Path "/api/v1/drivers/location" -AccessToken $adminToken -Body @{
    driverId = $courierProfile.driverId
    latitude = 0.0
    longitude = 0.0
} | Out-Null

$customerLogin = Connect-DemoAccount -Email $CustomerEmail -Password $CustomerPassword
$customerToken = $customerLogin.accessToken
$merchants = Invoke-Json -Method "GET" -Path "/api/v1/customer/merchants" -AccessToken $customerToken
$merchantId = [string]$merchantProfile.merchantId
$merchantOption = $merchants | Where-Object { [string]$_.id -eq $merchantId } | Select-Object -First 1
if (-not $merchantOption) {
    throw "The approved merchant was not returned by the customer merchant picker."
}

$order = Invoke-Json -Method "POST" -Path "/api/v1/customer/orders" -AccessToken $customerToken -Body @{
    merchantId = [string]$merchantOption.id
    totalAmount = 42.50
}

Invoke-Json -Method "POST" -Path "/api/v1/merchant/orders/$($order.id)/preparing" -AccessToken $merchantToken | Out-Null
Invoke-Json -Method "POST" -Path "/api/v1/merchant/orders/$($order.id)/ready-for-pickup" -AccessToken $merchantToken | Out-Null
Invoke-Json -Method "POST" -Path "/api/v1/courier/orders/$($order.id)/picked-up" -AccessToken $courierToken | Out-Null
$deliveredOrder = Invoke-Json -Method "POST" -Path "/api/v1/courier/orders/$($order.id)/delivered" -AccessToken $courierToken

[pscustomobject]@{
    customerEmail = $CustomerEmail
    merchantEmail = $MerchantEmail
    courierEmail = $CourierEmail
    merchantName = $merchantOption.name
    orderId = $deliveredOrder.id
    orderStatus = $deliveredOrder.status
    merchantPasswordChanged = $true
    courierPasswordChanged = $true
} | ConvertTo-Json -Depth 4
