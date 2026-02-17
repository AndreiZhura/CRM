import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Register.css';
import '../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Состояния для ответа от сервера
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Валидация (без изменений)
  const validateEmail = (value) => {
    if (!value) return 'Email не может быть пустым';
    const emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    if (!emailRegex.test(value)) return 'Email некорректный';
    return '';
  };

  const validatePassword = (value) => {
    if (value.length < 6) return 'Пароль должен быть не менее 6 символов';
    return '';
  };

  const validateConfirmPassword = (value, password) => {
    if (value !== password) return 'Пароли не совпадают';
    return '';
  };

  const validateName = (value) => {
    if (!value) return 'Имя не может быть пустым';
    const nameRegexLat = /^[A-Za-z -]+$/;
    const nameRegexKir = /^[А-Яа-я -]+$/;
    if (!nameRegexLat.test(value) && !nameRegexKir.test(value)) {
      return 'Некорректное имя! Используйте латинские или кириллические буквы';
    }
    return '';
  };

  const handleValidate = () => {
    const newErrors = {};
    newErrors.email = validateEmail(email);
    newErrors.password = validatePassword(password);
    newErrors.confirmPassword = validateConfirmPassword(confirmPassword, password);
    newErrors.name = validateName(name);

    setErrors(newErrors);
    return Object.keys(newErrors).every((key) => !newErrors[key]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!handleValidate()) return;

    setIsSubmitting(true);

    try {
      // Отправляем на бэкенд: username = email, password = password
      await api.register(email, password);  // name пока не отправляем
      
      // Успех
      setSuccessMessage('Регистрация прошла успешно! Сейчас вы будете перенаправлены на страницу входа.');
      
      // Перенаправляем на логин через 2 секунды
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Ошибка регистрации. Возможно, такой пользователь уже существует.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="register">
      <div className="register-main">
        <Link to="/" className="logo"></Link>
        <div className="auth">
          <h1 className="auth__title">Добро пожаловать!</h1>
          <div className="auth-main">
            <form className="auth-main__form" onSubmit={handleSubmit} noValidate>
              {/* Поле имени */}
              <label className="auth-main__title" htmlFor="name-input">
                Имя
              </label>
              <input
                className={`auth-main__input ${errors.name ? 'auth-main__input_error' : ''}`}
                id="name-input"
                type="text"
                name="name"
                placeholder="Виталий"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span className="auth-main__error">{errors.name}</span>}

              {/* Поле email */}
              <label className="auth-main__title" htmlFor="email-input">
                E-mail
              </label>
              <input
                className={`auth-main__input auth-main__input_email ${errors.email ? 'auth-main__input_error' : ''}`}
                id="email-input"
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="auth-main__error">{errors.email}</span>}

              {/* Поле пароля */}
              <label className="auth-main__title" htmlFor="password-input">
                Пароль
              </label>
              <div className="password-input-wrapper">
                <input
                  className={`auth-main__input ${errors.password ? 'auth-main__input_error' : ''}`}
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="auth-main__error">{errors.password}</span>}

              {/* Поле подтверждения пароля */}
              <label className="auth-main__title" htmlFor="confirm-password-input">
                Подтверждение пароля
              </label>
              <div className="password-input-wrapper">
                <input
                  className={`auth-main__input ${errors.confirmPassword ? 'auth-main__input_error' : ''}`}
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Подтвердите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={!!errors.confirmPassword}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPassword && <span className="auth-main__error">{errors.confirmPassword}</span>}

              {/* Сообщение об успехе */}
              {successMessage && <span className="auth-main__success">{successMessage}</span>}

              {/* Сообщение об ошибке */}
              {errorMessage && <span className="auth-main__error">{errorMessage}</span>}

              {/* Кнопка отправки */}
              <button
                type="submit"
                className={`auth-main__button auth-main__button_register ${
                  !errors.email &&
                  !errors.password &&
                  !errors.confirmPassword &&
                  !errors.name &&
                  !isSubmitting
                    ? ''
                    : 'auth-main__button_error'
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>

              {/* Ссылка на вход */}
              <p className="auth-main__text auth-main__text_register">
                Уже зарегистрированы?{' '}
                <Link to="/" className="auth-main__text-button auth-main__text-button_register">
                  Войти
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;