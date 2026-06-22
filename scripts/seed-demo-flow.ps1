param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminEmail = "admin@swiftdrop.com",
    [string]$AdminPassword = $env:SEED_ADMIN_PASSWORD,
    [string]$CustomerEmail = "customer.demo@swiftdrop.com",
    [string]$CustomerPassword = "Customer123!",
    [string]$MerchantEmail = "merchant.demo@swiftdrop.com",
    [string]$CourierEmail = "courier.demo@swiftdrop.com",
    [string]$NewMerchantPassword = "MerchantDemo123!",
    [string]$NewCourierPassword = "CourierDemo123!"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    throw "AdminPassword is required. Pass -AdminPassword or set SEED_ADMIN_PASSWORD locally."
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

function Login {
    param([string]$Email, [string]$Password)

    Invoke-Json -Method "POST" -Path "/api/v1/auth/login" -Body @{
        email = $Email
        password = $Password
    }
}

function Change-Password {
    param([string]$AccessToken, [string]$CurrentPassword, [string]$NewPassword)

    Invoke-Json -Method "POST" -Path "/api/v1/auth/change-password" -AccessToken $AccessToken -Body @{
        currentPassword = $CurrentPassword
        newPassword = $NewPassword
    }
}

Write-Host "Seeding SwiftDrop local demo flow through API at $BaseUrl"

$customer = Invoke-Json -Method "POST" -Path "/api/v1/auth/register" -Body @{
    email = $CustomerEmail
    password = $CustomerPassword
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

$admin = Login -Email $AdminEmail -Password $AdminPassword
$adminToken = $admin.accessToken

$merchantReview = Invoke-Json -Method "POST" -Path "/api/v1/admin/applications/merchants/$($merchantApplication.id)/approve" -AccessToken $adminToken -Body @{
    reviewNote = "Approved for local demo seed"
}

$courierReview = Invoke-Json -Method "POST" -Path "/api/v1/admin/applications/couriers/$($courierApplication.id)/approve" -AccessToken $adminToken -Body @{
    reviewNote = "Approved for local demo seed"
}

$merchantTempPassword = $merchantReview.provisionedAccount.temporaryPassword
$courierTempPassword = $courierReview.provisionedAccount.temporaryPassword

Write-Host "Local temporary merchant password: $merchantTempPassword"
Write-Host "Local temporary courier password: $courierTempPassword"

$merchantLogin = Login -Email $MerchantEmail -Password $merchantTempPassword
$merchantSession = Change-Password -AccessToken $merchantLogin.accessToken -CurrentPassword $merchantTempPassword -NewPassword $NewMerchantPassword
$merchantToken = $merchantSession.accessToken

$courierLogin = Login -Email $CourierEmail -Password $courierTempPassword
$courierSession = Change-Password -AccessToken $courierLogin.accessToken -CurrentPassword $courierTempPassword -NewPassword $NewCourierPassword
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

$customerLogin = Login -Email $CustomerEmail -Password $CustomerPassword
$customerToken = $customerLogin.accessToken
$merchants = @(Invoke-Json -Method "GET" -Path "/api/v1/customer/merchants" -AccessToken $customerToken)
$merchantOption = $merchants | Where-Object { $_.name -eq "Kadikoy Burger" } | Select-Object -First 1
if (-not $merchantOption) {
    throw "Kadikoy Burger was not returned by the customer merchant picker."
}

$order = Invoke-Json -Method "POST" -Path "/api/v1/customer/orders" -AccessToken $customerToken -Body @{
    merchantId = $merchantOption.id
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
