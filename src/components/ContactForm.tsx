'use client';

import { FormEvent, useState } from 'react';

export function ContactForm() {
  const [status, setStatus] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('請先填寫必填欄位。');
      return;
    }
    setStatus('表單寄送功能尚未設定，資料未送出。正式上線前請串接實際收件方式。');
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="field-row">
        <label><span>姓名</span><input name="name" autoComplete="name" required /></label>
        <label><span>公司名稱</span><input name="company" autoComplete="organization" /></label>
      </div>
      <label><span>電子郵件</span><input type="email" name="email" autoComplete="email" required /></label>
      <label>
        <span>需求說明</span>
        <textarea name="message" rows={6} required placeholder="簡單介紹你的產品、希望改善的問題、預計時程與預算範圍。" />
      </label>
      <button className="primary-button form-button" type="submit">送出合作需求</button>
      <p className="form-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
