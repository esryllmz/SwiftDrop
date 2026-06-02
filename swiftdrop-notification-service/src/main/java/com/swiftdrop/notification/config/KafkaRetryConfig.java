package com.swiftdrop.notification.config;

import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
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
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(defaultErrorHandler(kafkaTemplate, maxAttempts, backoffMs));
        return factory;
    }

    private DefaultErrorHandler defaultErrorHandler(
            KafkaTemplate<String, Object> kafkaTemplate,
            int maxAttempts,
            long backoffMs
    ) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, ex) -> {
                    String dltTopic = record.topic() + ".DLT";
                    log.warn(
                            "Publishing failed notification event to DLT. sourceTopic={}, dltTopic={}, partition={}, offset={}",
                            record.topic(),
                            dltTopic,
                            record.partition(),
                            record.offset(),
                            ex
                    );
                    return new TopicPartition(dltTopic, record.partition());
                }
        );
        long retryAttempts = Math.max(maxAttempts - 1L, 0L);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(backoffMs, retryAttempts));
    }
}
