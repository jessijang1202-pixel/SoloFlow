import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Key, UserPlus, LogIn, AlertCircle } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMessage('Supabase 클라이언트가 초기화되지 않았습니다.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        // Sign Up
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        
        if (data?.user && data.session) {
          alert('회원가입이 완료되고 로그인되었습니다!');
          onAuthSuccess();
        } else {
          alert('회원가입 확인 메일이 전송되었거나 가입이 완료되었습니다. 이메일을 확인해 주세요!');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // user-friendly messages
      let message = err.message || '인증에 실패했습니다.';
      if (message.includes('Invalid login credentials')) {
        message = '이메일 주소 또는 비밀번호가 잘못되었습니다.';
      } else if (message.includes('User already registered')) {
        message = '이미 가입된 이메일 주소입니다.';
      } else if (message.includes('Password should be')) {
        message = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        padding: '24px',
        background: 'radial-gradient(circle at top, rgba(139, 92, 246, 0.15) 0%, rgba(11, 15, 25, 0) 70%)',
        animation: 'fadeIn var(--transition-normal) forwards',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-primary)' }}>
            SoloFlow
          </span>
          <span
            style={{
              fontFamily: '"Nanum Pen Script", cursive',
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'var(--accent-color)',
              transform: 'rotate(-5deg)',
              display: 'inline-block',
            }}
          >
            미루지 마!
          </span>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
          친구들과 함께 쓰는 나만의 스마트 스케줄러
        </p>
      </div>

      {/* Auth Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          background: 'rgba(31, 41, 55, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-sm)',
              background: isLogin ? 'var(--accent-color)' : 'transparent',
              color: isLogin ? 'white' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <LogIn size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-sm)',
              background: !isLogin ? 'var(--accent-color)' : 'transparent',
              color: !isLogin ? 'white' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <UserPlus size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
            회원가입
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>이메일 주소</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                className="text-input"
                style={{ width: '100%', paddingLeft: '40px', minHeight: '44px', fontSize: '14px' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <Key
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="text-input"
                style={{ width: '100%', paddingLeft: '40px', minHeight: '44px', fontSize: '14px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '44px',
              marginTop: '8px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '처리 중...' : isLogin ? '로그인하기' : '가입하기'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {isLogin ? (
              <>
                처음이신가요?{' '}
                <span
                  onClick={() => setIsLogin(false)}
                  style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  회원가입하기
                </span>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <span
                  onClick={() => setIsLogin(true)}
                  style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  로그인하기
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
export default AuthView;
