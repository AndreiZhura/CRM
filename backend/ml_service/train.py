import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
import joblib

# Загружаем датасет
df = pd.read_csv('dataset.csv')

# Пример: прогноз количества заказов в день по городу
# Группируем по дате и локации
daily = df.groupby(['date', 'location']).size().reset_index(name='orders_count')
# Добавляем погодные признаки (берём среднее за день)
weather_cols = ['temp_avg', 'precipitation']
daily = daily.merge(
    df[['date', 'location', 'temp_avg', 'precipitation']].drop_duplicates(),
    on=['date', 'location'],
    how='left'
)

# Признаки
daily['date'] = pd.to_datetime(daily['date'])
daily['day_of_week'] = daily['date'].dt.dayofweek
daily['month'] = daily['date'].dt.month

features = ['day_of_week', 'month', 'temp_avg', 'precipitation']
X = daily[features]
y = daily['orders_count']

# Удаляем строки с пропусками
X = X.dropna()
y = y[X.index]

# Разделение на train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Масштабирование
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Сохраняем scaler
joblib.dump(scaler, 'models/scaler.pkl')

# Модель
model = Sequential([
    Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    Dropout(0.2),
    Dense(64, activation='relu'),
    Dropout(0.2),
    Dense(1)  # регрессия
])
model.compile(optimizer='adam', loss='mse', metrics=['mae'])

early_stop = EarlyStopping(patience=10, restore_best_weights=True)

history = model.fit(
    X_train_scaled, y_train,
    validation_split=0.2,
    epochs=200,
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

# Оценка
loss, mae = model.evaluate(X_test_scaled, y_test)
print(f'Test MAE: {mae}')

# Сохраняем модель
model.save('models/demand_model.h5')
print("Модель сохранена в models/demand_model.h5")