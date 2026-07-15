import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  Trophy, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Workflow, 
  Smartphone, 
  CloudLightning,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface LandingViewProps {
  onNavigateToApp: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigateToApp }) => {
  // Simulator states
  const [planDays, setPlanDays] = useState(5);
  const [actualDays, setActualDays] = useState(5);

  // Test states
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<string | null>(null);

  const quizQuestions = [
    {
      q: "하루를 시작하기 전에 시간 단위로 할 일 계획표가 세워져 있어야 마음이 편안한가요?",
      options: ["완전히 그렇다 (마음의 안정)", "가끔 그렇다 (필요할 때만)", "대체로 즉흥적이다 (그때그때)"]
    },
    {
      q: "계획했던 일정이 단 하루라도 지연되거나 뒤로 밀리면 엄청난 스트레스를 받나요?",
      options: ["극도로 스트레스 (용납 불가)", "약간 찜찜하지만 이월한다", "그럴 수도 있지 하고 편하게 넘긴다"]
    },
    {
      q: "현재 관리해야 하는 프로젝트(업무, 사이드 프로젝트, 공부 등)가 3개 이상인가요?",
      options: ["3개 이상 폭탄 수준 (정리가 절실)", "1~2개 수준 (관리가능)", "구체적인 프로젝트로 나누지 않는다"]
    }
  ];

  const handleQuizAnswer = (optionIndex: number) => {
    const nextAnswers = [...quizAnswers, optionIndex];
    setQuizAnswers(nextAnswers);

    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Calculate J Score
      // 0 index = 3 points (J-like), 1 index = 2 points, 2 index = 1 point
      const score = nextAnswers.reduce((sum, val) => sum + (3 - val), 0);
      let resultText = "";
      if (score >= 8) {
        resultText = "🔥 설계도면급 계획형! '신화 속 극강의 J' (적합도 200%)";
      } else if (score >= 5) {
        resultText = "📐 안정적인 체계형! '듬직한 정통 J' (적합도 120%)";
      } else {
        resultText = "🌱 자유로운 탐험형! 'J의 체계성이 필요한 P' (적합도 90%)";
      }
      setQuizResult(resultText);
      setQuizStep(3); // Result stage
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers([]);
    setQuizResult(null);
  };

  // Plan vs Actual simulation computations
  const simResult = useMemo(() => {
    const difference = actualDays - planDays;
    if (difference < 0) {
      return {
        status: 'early',
        badge: '조기 완료 (Super J)',
        badgeClass: 'early',
        color: '#10b981',
        icon: <CheckCircle2 size={16} />,
        comment: "기대를 뛰어넘는 속도! 완벽한 시간 통제로 계획보다 앞서 도달했습니다. 극 J의 모범 사례입니다. 🎉"
      };
    } else if (difference === 0) {
      return {
        status: 'on-time',
        badge: '일정 준수 (안정)',
        badgeClass: 'completed',
        color: '#3b82f6',
        icon: <CheckCircle2 size={16} />,
        comment: "한 치의 오차도 없는 정확함! 목표했던 마감일에 완벽히 정조준하여 달성했습니다. 심신이 편안해집니다. 📐"
      };
    } else {
      const isDangerous = difference >= 3;
      return {
        status: isDangerous ? 'danger' : 'warning',
        badge: isDangerous ? '🚨 지연 지체 (미루지 마!)' : '⚠️ 지연 위험 (경고)',
        badgeClass: isDangerous ? 'delayed' : 'warning',
        color: isDangerous ? '#ef4444' : '#f59e0b',
        icon: <AlertTriangle size={16} />,
        comment: isDangerous 
          ? `계획보다 ${difference}일 지연되었습니다! 어제 미룬 일은 오늘 아침 강제 이월되었습니다. 정신 차리고 다시 움직이세요! 🥊`
          : `마감보다 ${difference}일 늦어졌습니다. 일정에 균열이 생기고 있습니다. 지연 경보 단계를 점검하고 즉시 실행하세요!`
      };
    }
  }, [planDays, actualDays]);

  return (
    <div className="landing-container">
      {/* 1. Ambient Background Glows */}
      <div className="glow-container">
        <div className="glow-sphere glow-purple" />
        <div className="glow-sphere glow-blue" />
      </div>

      {/* 2. Navigation Header */}
      <header className="landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SoloFlow
          </span>
          <span className="cursive-badge">미루지 마!</span>
        </div>
        <button className="nav-cta-btn" onClick={onNavigateToApp}>
          앱 실행하기
          <ArrowRight size={14} />
        </button>
      </header>

      {/* 3. Hero Section */}
      <section className="hero-section">
        <div className="badge-wrapper animate-fade-in">
          <span className="hero-mini-badge">
            <Sparkles size={12} style={{ color: 'var(--accent-color)' }} />
            프로젝트 관리 & 자동 이월 탑재
          </span>
        </div>
        <h1 className="hero-title animate-slide-up-heading">
          프로젝트가 많은<br />
          <span className="gradient-text">극 J를 위한 스케줄러</span>
        </h1>
        <p className="hero-subtitle animate-fade-in">
          계획 지연 스트레스는 이제 그만. 마감일 대비 실제 완료일을 추적하는 
          <strong> Plan vs Actual 타임라인</strong>과 미루기 방지 <strong>자동 이월 시스템</strong>으로 철저하게 통제하세요.
        </p>
        
        <div className="hero-cta-group animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button className="primary-cta-btn" onClick={onNavigateToApp}>
            무료로 SoloFlow 시작하기
            <ArrowRight size={18} />
          </button>
          <a href="#simulator" className="secondary-cta-btn">
            시뮬레이션 체험
          </a>
        </div>

        {/* Mock App Frame Showcase */}
        <div className="hero-mockup-frame animate-scale-in">
          <div className="mockup-header">
            <div className="mockup-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="mockup-url">soloflow.app/today</div>
          </div>
          <div className="mockup-content">
            <div className="mockup-sidebar">
              <div className="sidebar-item active"><CheckSquare size={14} /> 오늘 할 일</div>
              <div className="sidebar-item"><Calendar size={14} /> 주간/월간</div>
              <div className="sidebar-item"><Trophy size={14} /> 목표관리 (Timeline)</div>
            </div>
            <div className="mockup-main">
              <div className="mockup-alert">
                <span className="alert-emoji">📅</span>
                <div>
                  <strong>날짜 변경 감지!</strong>
                  <p>어제 미처 완료하지 못한 업무 3개가 오늘로 자동 이월되었습니다.</p>
                </div>
              </div>
              <div className="mockup-todo-list">
                <div className="mockup-todo-item done">
                  <span className="checkbox checked">✓</span>
                  <span className="title">UI 디자인 와이어프레임 완성</span>
                  <span className="badge-dev">앱개발</span>
                </div>
                <div className="mockup-todo-item">
                  <span className="checkbox"></span>
                  <span className="title">Supabase 실시간 백업 API 연동</span>
                  <span className="badge-dev">앱개발</span>
                </div>
                <div className="mockup-todo-item warning">
                  <span className="checkbox"></span>
                  <span className="title">유튜브 영상 1편 편집 및 렌더링</span>
                  <span className="badge-youtube">유튜브</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Plan vs Actual Simulator */}
      <section id="simulator" className="section-container">
        <div className="section-header">
          <h2 className="section-title">
            <Workflow size={24} style={{ color: 'var(--accent-color)', marginRight: '8px', verticalAlign: 'middle' }} />
            Plan vs Actual 실시간 시뮬레이션
          </h2>
          <p className="section-desc">
            마일스톤을 세우고 완료 날짜를 변경해 보세요. SoloFlow가 극 J의 관점으로 계획 일치 여부를 즉시 평가해 드립니다.
          </p>
        </div>

        <div className="simulator-grid">
          <div className="simulator-card-left">
            <div className="slider-group">
              <div className="slider-header">
                <span>📅 목표 계획 기간 (Plan)</span>
                <span className="slider-value">{planDays} 일</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={planDays} 
                onChange={(e) => setPlanDays(Number(e.target.value))}
                className="sim-range-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span>⏱️ 실제 완료 소요 기간 (Actual)</span>
                <span className="slider-value" style={{ color: actualDays > planDays ? '#ef4444' : '#10b981' }}>{actualDays} 일</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={actualDays} 
                onChange={(e) => setActualDays(Number(e.target.value))}
                className="sim-range-input"
              />
            </div>

            <div className="sim-indicator-timeline">
              <div className="timeline-bar-bg">
                <div className="timeline-plan-indicator" style={{ width: `${planDays * 10}%` }}>
                  <span>Plan ({planDays}d)</span>
                </div>
                <div 
                  className="timeline-actual-indicator" 
                  style={{ 
                    width: `${actualDays * 10}%`,
                    backgroundColor: simResult.color 
                  }}
                >
                  <span>Actual ({actualDays}d)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="simulator-card-right" style={{ borderLeft: `4px solid ${simResult.color}` }}>
            <div className="sim-badge-wrapper">
              <span className={`badge-timeline ${simResult.badgeClass}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
                {simResult.icon}
                {simResult.badge}
              </span>
            </div>
            <p className="sim-comment">
              {simResult.comment}
            </p>
            <div className="sim-helper-tips">
              <div className="tip-row">
                <span className="tip-bullet">•</span>
                <span><strong>일정 조율 피드백</strong>: 지연이 누적될 경우 경고 알림 및 자동 리마인더 기능 작동</span>
              </div>
              <div className="tip-row">
                <span className="tip-bullet">•</span>
                <span><strong>스마트 마일스톤</strong>: 엑셀(CSV)이나 이미지 업로드로 타임라인 즉시 빌드 기능 연계</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. J 성향 테스트 */}
      <section className="section-container bg-dark-card" style={{ borderRadius: 'var(--radius-lg)', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span className="hero-mini-badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a855f7' }}>
            계획 성향 테스트
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '10px', marginBottom: '8px' }}>
            나의 극 J 지수 자가진단 퀴즈
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            간단한 3가지 문항으로 계획 통제력을 확인하고 가장 완벽한 대안을 제시받으세요.
          </p>
        </div>

        <div className="quiz-box">
          {quizStep < 3 ? (
            <div className="quiz-active">
              <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }} />
              </div>
              <div className="quiz-question-counter">문항 {quizStep + 1} / {quizQuestions.length}</div>
              <h3 className="quiz-question-text">{quizQuestions[quizStep].q}</h3>
              
              <div className="quiz-options-list">
                {quizQuestions[quizStep].options.map((opt, idx) => (
                  <button 
                    key={idx} 
                    className="quiz-option-btn"
                    onClick={() => handleQuizAnswer(idx)}
                  >
                    <span>{opt}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-result-view animate-scale-in" style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div className="quiz-result-icon">🎯</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>진단 결과</h3>
              <p className="quiz-result-badge-text">{quizResult}</p>
              
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 24px auto' }}>
                여러 개의 프로젝트가 동시에 굴러갈 때 일정이 뒤틀리면 극심한 피로감을 느끼시는 군요! 
                일정을 오늘 하루 단위로 이월해주고 Plan vs Actual을 실시간 분석하는 **SoloFlow**가 완벽한 해결책입니다.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="primary-cta-btn" style={{ padding: '10px 20px', fontSize: '14px' }} onClick={onNavigateToApp}>
                  SoloFlow로 바로 시작하기
                </button>
                <button className="secondary-cta-btn" style={{ padding: '10px 20px', fontSize: '14px' }} onClick={resetQuiz}>
                  다시 테스트하기
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Feature Grid */}
      <section className="section-container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>극 J들이 SoloFlow에 열광하는 3가지 이유</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
            일반 투두리스트와는 완전히 다릅니다. 철저히 통제된 스케줄을 경험하세요.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <RefreshCw size={24} className="feature-animate-spin" />
            </div>
            <h3 className="feature-card-title">미루기 방지 자동 이월 (Auto-Rollover)</h3>
            <p className="feature-card-desc">
              어제 다 끝내지 못한 할 일 목록이 오늘 아침 자동으로 투두리스트로 슬라이드 이월됩니다. 매번 새로 적는 귀찮음과 죄책감 없이 즉각적인 업무 연속성을 제공합니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Trophy size={24} />
            </div>
            <h3 className="feature-card-title">Plan vs Actual 마일스톤</h3>
            <p className="feature-card-desc">
              단순 체크박스가 아닙니다. 엑셀(CSV) 등록이나 스케줄표 이미지 업로드를 통해 단계를 자동 추출하고, 계획일 대비 실제 완료일을 그래프로 명확하게 대조/분석합니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 className="feature-card-title">초정밀 오프라인-온라인 동기화</h3>
            <p className="feature-card-desc">
              로그인 없이 기기 로컬 저장소에 우선 데이터가 안전하게 기록되며, 계정 연동 시 Supabase 클라우드 데이터베이스에 오프라인 지연 변수 없이 완벽하게 백업 및 동기화됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="bottom-cta-section">
        <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>
          더 이상 미루지 마세요.
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
          프로젝트별 마감선을 철저히 통제하고, 자동 이월 리마인더와 함께 계획대로 인생을 세팅해 보세요. 
          오직 극 J를 위해 설계된 스케줄러 SoloFlow를 지금 다운로드 없이 무료로 사용해보세요!
        </p>
        <button className="primary-cta-btn" style={{ padding: '16px 36px', fontSize: '17px', margin: '0 auto' }} onClick={onNavigateToApp}>
          지금 무료로 시작하기
          <ArrowRight size={20} />
        </button>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px', flexWrap: 'wrap' }}>
          <div className="cta-trust-badge"><Smartphone size={16} /> PWA 모바일 설치 지원</div>
          <div className="cta-trust-badge"><CloudLightning size={16} /> 로그인 없이 바로 사용</div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="landing-footer-dark">
        <p>© 2026 SoloFlow. 극 J를 위한 오답 노트형 스케줄러. All rights reserved.</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          미루지 마! 멘토링 프로그램 연동 PWA 앱 서비스.
        </p>
      </footer>
    </div>
  );
};

export default LandingView;
