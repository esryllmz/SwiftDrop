package com.swiftdrop.notification.config;

import java.util.Objects;

import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class KafkaRetryConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${application.kafka.retry.max-attempts:3}") int maxAttempts,
            @Value("${application.kafka.retry.backoff-ms:1000}") long backoffMs
    ) {
        ConsumerFactory<String, Object> typedConsumerFactory = Objects.requireNonNull(
                consumerFactory,
                "consumerFactory must not be null"
        );
        CommonErrorHandler errorHandler = defaultErrorHandler(kafkaTemplate, maxAttempts, backoffMs);
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(typedConsumerFactory);
        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }

    private CommonErrorHandler defaultErrorHandler(
            KafkaTemplate<String, Object> kafkaTemplate,
            int maxAttempts,
            long backoffMs
    ) {
        KafkaTemplate<String, Object> template = Objects.requireNonNull(kafkaTemplate, "kafkaTemplate must not be null");
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                template,
                (record, ex) -> {
                    String sourceTopic = Objects.requireNonNull(record.topic(), "Kafka record topic must not be null");
                    String dltTopic = sourceTopic + ".DLT";
                    log.warn(
                            "Publishing failed notification event to DLT. sourceTopic={}, dltTopic={}, partition={}, offset={}",
                            sourceTopic,
                            dltTopic,
                            record.partition(),
                            record.offset(),
                            ex
                    );
                    return new TopicPartition(dltTopic, record.partition());
                }
        );
        long retryAttempts = Math.max(maxAttempts - 1L, 0L);
        FixedBackOff backOff = new FixedBackOff(backoffMs, retryAttempts);
        CommonErrorHandler errorHandler = new DefaultErrorHandler(recoverer, backOff);
        return errorHandler;
    }
}
