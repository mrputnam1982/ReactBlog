package com.mikep.ReactApp.Event;

import com.mikep.ReactApp.Annotations.Cascade;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Field;
import java.util.Collection;
import java.util.Objects;

@RequiredArgsConstructor
public class CascadeDeleteCallback implements ReflectionUtils.FieldCallback {
    private final Object source;
    private final MongoOperations mongoOperations;
    public @Override void doWith(final Field field) throws IllegalArgumentException, IllegalAccessException {
        ReflectionUtils.makeAccessible(field);
        if (field.isAnnotationPresent(DBRef.class) && field.isAnnotationPresent(Cascade.class)) {
            final Object fieldValue = field.get(source);
            if (Objects.nonNull(fieldValue)) {
                final var callback = new IdentifierCallback();
                final javax.persistence.CascadeType cascadeType = field.getAnnotation(Cascade.class).value();
                if (cascadeType.equals(CascadeType.DELETE) || cascadeType.equals(CascadeType.ALL)) {
                    if (fieldValue instanceof Collection<?>) {
                        ((Collection<?>) fieldValue).forEach(mongoOperations::remove);
                    } else {
                        ReflectionUtils.doWithFields(fieldValue.getClass(), callback);
                        mongoOperations.remove(fieldValue);
                    }
                }
            }
        }
    }
}