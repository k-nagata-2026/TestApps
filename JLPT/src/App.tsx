function Result2({ questions, answers, onDashboard, onReview }: { questions: Question[]; answers: Record<number, number[]>; onDashboard: () => void; onReview: () => void }) {
  const correctFor = (question: Question, index: number) => { const expected = question.correctIndexes ?? [question.correctIndex ?? 0]; const given = answers[index] ?? []; return given.length === expected.length && given.every((item) => expected.includes(item)) }
  const correctCount = questions.filter(correctFor).length
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const incorrectCount = questions.length - correctCount
  return <><PageHeading eyebrow="TEST RESULT" title="テスト結果" description="回答内容を採点しました。" action={<button className="secondary" onClick={onDashboard}>ダッシュボードへ</button>} /><section className="result-hero panel"><div className="result-circle" style={{ background: `conic-gradient(var(--purple) 0 ${score}%, #e5e2f6 ${score}% 100%)` }}><strong>{score}<small>%</small></strong><span>目標ライン 70%</span></div><div className="result-message"><span className="label">{score >= 70 ? 'GREAT JOB!' : 'KEEP GOING!'}</span><h3>{score >= 70 ? '目標ラインをクリアしました' : '復習して再挑戦しましょう'}</h3><div className="result-stats"><span><b>{correctCount}</b>正解</span><span><b>{incorrectCount}</b>不正解</span><span><b>{Object.keys(answers).length}</b>回答済み</span></div></div></section><section className="panel result-next"><span className="label">NEXT STEP</span><h3>間違えた問題を復習</h3><p>{incorrectCount}問の不正解問題を確認できます。</p><button className="primary" onClick={onReview}>復習を始める <span>→</span></button></section></>
}

function QuestionText({ text }: { text: string }) {
  const normalizedText = text.replace(/\\n/g, '\n')
  const marker = '[コード]'
  const markerIndex = normalizedText.indexOf(marker)
  if (markerIndex < 0) return <h3>{normalizedText}</h3>

  const title = normalizedText.slice(0, markerIndex).trim()
  const body = normalizedText.slice(markerIndex + marker.length)
  const lines = body.split(/\r?\n/)
  const noteStart = lines.findIndex((line) => line.startsWith('※'))
  const rawCodeLines = noteStart >= 0 ? lines.slice(0, noteStart) : lines
  const firstCodeLine = rawCodeLines.findIndex((line) => line.trim().length > 0)
  const codeLines = firstCodeLine >= 0 ? rawCodeLines.slice(firstCodeLine) : []
  const noteLines = noteStart >= 0 ? lines.slice(noteStart) : []

  return <>
    <h3>{title}</h3>
    <p className="muted">[コード]</p>
    <pre className="question-code">{codeLines.map((line, index) => `${index + 1}. ${line}`).join('\n')}</pre>
    {noteLines.length > 0 && <p className="muted">{noteLines.join('\n')}</p>}
  </>
}

function Review2({ results, onBack }: { results: TestResult[]; onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(results[0]?.id ?? '')
  const selectedResult = results.find((result) => result.id === selectedId) ?? results[0]
  const reviewQuestions = selectedResult ? selectedResult.questions.map((question, index) => ({ question, index })) : []
  const incorrect = selectedResult ? selectedResult.questions.filter((question, index) => { const expected = question.correctIndexes ?? [question.correctIndex ?? 0]; const given = selectedResult.answers[index] ?? []; return given.length !== expected.length || !given.every((item) => expected.includes(item)) }) : []

  return <><button className="back-link" onClick={onBack}>← ダッシュボードに戻る</button><PageHeading eyebrow="REVIEW" title="復習" description="復習するテストを選択してください。" /><section className="panel result-history"><h3>直近のテスト結果</h3>{results.length ? <div className="history-list">{results.map((result, index) => <button className={`history-item ${result.id === selectedResult?.id ? 'selected' : ''}`} key={result.id} onClick={() => setSelectedId(result.id)}><span className="history-index">{index + 1}</span><span><b>{result.mode === 'practice' ? '練習テスト' : '本番模擬テスト'}</b><small>{result.completedAt} · {result.questions.length}問</small></span><strong>{result.questions.length - incorrectCount(result)}問正解</strong></button>)}</div> : <p className="muted">まだテスト結果がありません。テストを完了すると、ここから復習できます。</p>}</section>{selectedResult && <><PageHeading eyebrow="SELECTED TEST" title="問題の見直し" description={`${selectedResult.completedAt}のテスト結果`} action={<span className="review-count">不正解 {incorrect.length}問 / 全{reviewQuestions.length}問</span>} /><div className="review-list">{reviewQuestions.length ? reviewQuestions.map(({ question, index: originalIndex }, questionIndex) => { const expected = question.correctIndexes ?? [question.correctIndex ?? 0]; const given = selectedResult.answers[originalIndex] ?? []; return <div className="review-item panel" key={`${question.text}-${originalIndex}`}><div className="review-number">Q {questionIndex + 1}</div><div className="review-body"><span className="label">{question.category}</span><QuestionText text={question.text} /><div className="review-options">{question.options.map((option, optionIndex) => <div className={`review-option ${expected.includes(optionIndex) ? 'review-correct' : ''} ${given.includes(optionIndex) && !expected.includes(optionIndex) ? 'review-wrong' : ''}`} key={`${option}-${optionIndex}`}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{expected.includes(optionIndex) && <b>正答</b>}{given.includes(optionIndex) && <i>あなたの回答</i>}</div>)}</div><p className="muted">解説：{question.explanation || '解説未登録'}</p></div></div> }) : <section className="panel"><p className="muted">このテスト結果はありません。</p></section>}</div></>}</>
}
function incorrectCount(result: TestResult) { return result.questions.filter((question, index) => { const expected = question.correctIndexes ?? [question.correctIndex ?? 0]; const given = result.answers[index] ?? []; return given.length !== expected.length || !given.every((item) => expected.includes(item)) }).length }
function Exam3({ mode, questions, questionIndexes, index, total, answers, onAnswer, onJump, onNext, onPrev, onSubmit, pageAnswered }: { mode: ExamMode; questions: Question[]; questionIndexes: number[]; index: number; total: number; answers: Record<number, number[]>; onAnswer: (questionIndex: number, selection: number[]) => void; onJump: (index: number) => void; onNext: () => void; onPrev: () => void; onSubmit: () => void; pageAnswered: (pageIndex: number) => boolean }) {
  const [selectionMap, setSelectionMap] = useState<Record<number, number[]>>({})
  useEffect(() => {
    const next: Record<number, number[]> = {}
    questionIndexes.forEach((questionIndex) => { next[questionIndex] = answers[questionIndex] ?? [] })
    setSelectionMap(next)
  }, [questionIndexes, answers])

  const choose = (questionIndex: number, optionIndex: number, multiple: boolean, answered: boolean) => {
    if (mode === 'practice' && answered) return
    const current = selectionMap[questionIndex] ?? []
    const next = multiple ? (current.includes(optionIndex) ? current.filter((item) => item !== optionIndex) : [...current, optionIndex]) : [optionIndex]
    setSelectionMap((value) => ({ ...value, [questionIndex]: next }))
    if (mode === 'mock') onAnswer(questionIndex, next)
  }

  const confirm = (questionIndex: number) => {
    const selection = selectionMap[questionIndex] ?? []
    if (selection.length > 0) onAnswer(questionIndex, selection)
  }

  const isCorrect = (given: number[], correctIndexes: number[]) => given.length === correctIndexes.length && given.every((item) => correctIndexes.includes(item))

  return <><div className="exam-top"><div><span className="label">{mode === 'practice' ? 'PRACTICE MODE' : 'MOCK EXAM'}</span><h2>{mode === 'practice' ? '練習テスト' : '本番模擬テスト'}</h2></div><div className="timer">ページ {index + 1}<span>/ {total}</span></div></div><div className="exam-progress"><div className="bar"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div></div><div className="exam-layout"><section className="panel question-card">{questionIndexes.map((questionIndex, blockIndex) => { const question = questions[questionIndex]; const correctIndexes = question.correctIndexes ?? [question.correctIndex ?? 0]; const multiple = correctIndexes.length > 1; const committed = answers[questionIndex] ?? []; const answered = answers[questionIndex] !== undefined; const showFeedback = mode === 'practice' && answered; const selection = selectionMap[questionIndex] ?? []; return <div className="question-block" key={`${question.text}-${questionIndex}`}><div className="question-meta"><span>Q {String(questionIndex + 1).padStart(2, '0')}</span><b>{question.category}</b></div><QuestionText text={question.text} /><p className="muted">{multiple ? '正しいものをすべて選択してください。' : '最も適切なものを1つ選んでください。'}</p><div className="answer-list">{question.options.map((option, i) => { const isCorrectOption = correctIndexes.includes(i); const isWrongSelection = showFeedback && selection.includes(i) && !isCorrectOption; return <button className={`answer-option ${selection.includes(i) ? 'selected' : ''} ${showFeedback && isCorrectOption ? 'correct-answer' : ''} ${isWrongSelection ? 'wrong-answer' : ''}`} disabled={mode === 'practice' && answered} key={option} onClick={() => choose(questionIndex, i, multiple, answered)}><span>{String.fromCharCode(65 + i)}</span>{option}{showFeedback && isCorrectOption && <i>正解</i>}{isWrongSelection && <i>不正解</i>}</button> })}</div>{mode === 'practice' && !answered && <button className="primary practice-answer" onClick={() => confirm(questionIndex)} disabled={!selection.length}>回答する <span>→</span></button>}{showFeedback && <div className={`practice-explanation ${isCorrect(committed, correctIndexes) ? 'correct' : 'incorrect'}`}><strong>{isCorrect(committed, correctIndexes) ? '正解' : '不正解'}</strong><p>{!isCorrect(committed, correctIndexes) && `正解：${correctIndexes.map((correctIndex) => question.options[correctIndex]).join(' / ')}`}</p><p>{question.explanation || '解説未登録'}</p></div>}{blockIndex < questionIndexes.length - 1 && <hr className="question-divider" />}</div> })}<div className="question-actions"><button className="secondary" onClick={onPrev} disabled={index === 0}>← 前のページ</button>{index === total - 1 ? <button className="primary" onClick={onSubmit}>採点する <span>→</span></button> : <button className="primary" onClick={onNext}>次のページ <span>→</span></button>}</div>{mode === 'mock' && <button className="finish-test" onClick={onSubmit}>テストを終了して採点する</button>}</section><aside className="question-nav panel"><h3>ページ一覧</h3><div className="number-grid">{Array.from({ length: total }, (_, i) => <button className={`${i === index ? 'current' : ''} ${pageAnswered(i) ? 'answered' : ''}`} key={i} onClick={() => onJump(i)}>{i + 1}</button>)}</div><div className="legend"><span><i className="dot current-dot" />現在のページ</span><span><i className="dot answered-dot" />回答済み</span></div>{mode === 'mock' && <button className="finish-test side-finish" onClick={onSubmit}>採点して終了</button>}</aside></div></>
}
import { useEffect, useState, type ReactNode } from 'react'
import './App.css'

function Settings2({ selectedLevel, selectedGenre, selectedCategories, selectedExamSize, selectedMode, onLevelChange, onGenreChange, onExamSizeChange, onModeChange, onBack, onStart }: { selectedLevel: ExamLevel; selectedGenre: ExamGenre; selectedCategories: string[]; selectedExamSize: ExamSize; selectedMode: ExamMode; onLevelChange: (level: ExamLevel) => void; onGenreChange: (genre: ExamGenre) => void; onExamSizeChange: (size: ExamSize) => void; onModeChange: (mode: ExamMode) => void; onBack: () => void; onStart: (categories: string[], size: ExamSize) => Promise<void> }) {
  const [error, setError] = useState('')
  const sizeOptions = selectedGenre === '読解' ? ([2, 4, 6] as const) : ([10, 30, 60] as const)
  const available = selectedCategories.reduce((total, category) => total + (categoryDefinitions.find((definition) => definition.name === category)?.count ?? 0), 0)
  const hasMetadata = selectedCategories.every((category) => categoryDefinitions.some((definition) => definition.name === category))
  const start = async () => {
    if (!selectedCategories.length) { setError('選択したレベル・ジャンルの問題が見つかりません。カテゴリ名に「N2/N3/N4」と「言語知識/読解」を含めてください。'); return }
    if (selectedGenre === '言語知識' && hasMetadata && available < selectedExamSize) { setError(`選択した範囲の問題数は${available}問です。${selectedExamSize}問以上になるように見直してください。`); return }
    setError('')
    try {
      await onStart(selectedCategories, selectedExamSize)
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : '問題の取得に失敗しました。しばらくしてから再試行してください。'
      setError(message)
    }
  }
  return <><button className="back-link" onClick={onBack}>← ダッシュボードに戻る</button><PageHeading eyebrow="TEST SETUP" title="テスト条件設定" description="難易度→ジャンル→モード→問題数の順に選択してください。" /><div className="setup-layout"><section className="panel setup-card"><h3>難易度選択</h3><div className="mode-options option-grid">{examLevels.map((level) => <button className={selectedLevel === level ? 'selected' : ''} key={level} onClick={() => { onLevelChange(level); setError('') }}><strong>{level}</strong></button>)}</div><h3 className="setup-subtitle">ジャンル選択</h3><div className="mode-options option-grid">{examGenres.map((genre) => <button className={selectedGenre === genre ? 'selected' : ''} key={genre} onClick={() => { onGenreChange(genre); setError('') }}><strong>{genre}</strong></button>)}</div><h3 className="setup-subtitle">テストモード</h3><div className="mode-options"><button className={selectedMode === 'mock' ? 'selected' : ''} onClick={() => onModeChange('mock')}><strong>本番モード</strong><span>全問回答後に採点</span></button><button className={selectedMode === 'practice' ? 'selected' : ''} onClick={() => onModeChange('practice')}><strong>練習モード</strong><span>回答直後に解説を表示</span></button></div><h3 className="setup-subtitle">問題数選択</h3><div className="mode-options option-grid">{sizeOptions.map((size) => <button className={selectedExamSize === size ? 'selected' : ''} key={size} onClick={() => { onExamSizeChange(size); setError('') }}><strong>{size}問</strong></button>)}</div><p className="muted">{selectedGenre === '読解' ? '読解はA/Bグループを均等に2問・4問・6問で出題します。' : '言語知識は10問・30問・60問から選択できます。'}</p>{error && <p className="setup-error" role="alert">{error}</p>}</section><aside className="panel test-preview"><span className="label">TEST PREVIEW</span><h3>{selectedMode === 'practice' ? '練習テスト' : '本番テスト'}</h3><div className="preview-row"><span>難易度</span><b>{selectedLevel}</b></div><div className="preview-row"><span>ジャンル</span><b>{selectedGenre}</b></div><div className="preview-row"><span>問題数</span><b>{selectedExamSize}問</b></div><button className="primary full" onClick={start}>この条件で開始 <span>→</span></button></aside></div></>
}

function Exam2({ mode, question, index, total, answers, answeredCount, onAnswer, onJump, onNext, onPrev, onSubmit }: { mode: ExamMode; question: Question; index: number; total: number; answers: Record<number, number>; answeredCount: number; onAnswer: (i: number) => void; onJump: (index: number) => void; onNext: () => void; onPrev: () => void; onSubmit: () => void }) {
  const [selectedOption, setSelectedOption] = useState<number | undefined>(answers[index])
  useEffect(() => setSelectedOption(answers[index]), [answers, index])
  const selected = mode === 'practice' ? selectedOption : answers[index]
  const answered = answers[index] !== undefined
  const commitPracticeAnswer = () => { if (selectedOption !== undefined) onAnswer(selectedOption) }
  return <><div className="exam-top"><div><span className="label">{mode === 'practice' ? 'PRACTICE MODE' : 'MOCK EXAM'}</span><h2>{mode === 'practice' ? '練習テスト' : '本番模擬テスト'}</h2></div><div className="timer">問題 {index + 1}<span>/ {total}</span></div></div><div className="exam-progress"><span>{answeredCount}問回答済み</span><div className="bar"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div><span>{mode === 'practice' ? '練習' : '本番'}</span></div><div className="exam-layout"><section className="panel question-card"><div className="question-meta"><span>Q {String(index + 1).padStart(2, '0')}</span><b>{question.category}</b></div><h3>{question.text}</h3><p className="muted">最も適切なものを1つ選んでください。</p><div className="answer-list">{question.options.map((option, i) => <button className={`answer-option ${selected === i ? 'selected' : ''}`} key={option} onClick={() => mode === 'practice' ? setSelectedOption(i) : onAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{selected === i && <i>✓</i>}</button>)}</div>{mode === 'practice' && !answered && <button className="primary practice-answer" onClick={commitPracticeAnswer} disabled={selectedOption === undefined}>回答する <span>→</span></button>}{mode === 'practice' && answered && <div className={`practice-explanation ${answers[index] === question.correctIndex ? 'correct' : 'incorrect'}`}><strong>{answers[index] === question.correctIndex ? '正解' : '不正解'}</strong><p>{question.explanation || '解説未登録'}</p></div>}<div className="question-actions"><button className="secondary" onClick={onPrev} disabled={index === 0}>← 前の問題</button>{index === total - 1 ? <button className="primary" onClick={onSubmit}>採点する <span>→</span></button> : <button className="primary" onClick={onNext}>次の問題 <span>→</span></button>}</div>{mode === 'mock' && <button className="finish-test" onClick={onSubmit}>テストを終了して採点する</button>}</section><aside className="question-nav panel"><h3>問題一覧</h3><div className="number-grid">{Array.from({ length: total }, (_, i) => <button className={`${i === index ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`} key={i} onClick={() => onJump(i)}>{i + 1}</button>)}</div><div className="legend"><span><i className="dot current-dot" />現在の問題</span><span><i className="dot answered-dot" />回答済み</span></div>{mode === 'mock' && <button className="finish-test side-finish" onClick={onSubmit}>採点して終了</button>}</aside></div></>
}

type Screen = 'login' | 'dashboard' | 'settings' | 'exam' | 'result' | 'analytics' | 'review'
type ExamMode = 'practice' | 'mock'
type ExamSize = 2 | 4 | 6 | 10 | 30 | 60
type ExamLevel = 'N2' | 'N3' | 'N4'
type ExamGenre = '言語知識' | '読解'
type Question = { category: string; text: string; options: string[]; correctIndex?: number; correctIndexes?: number[]; explanation?: string }
type ExamPage = { key: string; questionIndexes: number[] }
type TestResult = { id: string; completedAt: string; mode: ExamMode; questions: Question[]; answers: Record<number, number[]> }
const categoryDefinitions = [
  { name: 'N2-言語知識', count: 200 },
  { name: 'N2-読解', count: 60 },
  { name: 'N3-言語知識', count: 200 },
  { name: 'N3-読解', count: 60 },
  { name: 'N4-言語知識', count: 99 },
  { name: 'N4-読解', count: 30 },
]
const examLevels: ExamLevel[] = ['N2', 'N3', 'N4']
const examGenres: ExamGenre[] = ['言語知識', '読解']
const categoryMatches = (category: string, level: ExamLevel, genre: ExamGenre) => category.includes(level) && category.includes(genre)
const categoriesForSelection = (categories: string[], level: ExamLevel, genre: ExamGenre) => categories.filter((category) => categoryMatches(category, level, genre))
const readingRangePattern = /第(\d+)問と第\d+問に答えなさい/
const readingReferencePattern = /第(\d+)問/
const readingPageKey = (question: Question, index: number) => {
  const range = question.text.match(readingRangePattern)
  if (range) return `${question.category}:${range[1]}`
  const reference = question.text.match(readingReferencePattern)
  if (reference) return `${question.category}:${reference[1]}`
  return `${question.category}:single-${index}`
}
const buildExamPages = (questions: Question[], readingMode: boolean) => {
  if (!readingMode) return questions.map((_, index) => ({ key: `q-${index}`, questionIndexes: [index] }))
  const pages: ExamPage[] = []
  questions.forEach((question, index) => {
    const key = readingPageKey(question, index)
    const last = pages[pages.length - 1]
    if (last && last.key === key) {
      last.questionIndexes.push(index)
      return
    }
    pages.push({ key, questionIndexes: [index] })
  })
  return pages
}
const testResultsStorageKey = 'japanese-study-test-results'
const apiBaseUrl = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8080' : ''

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [examPages, setExamPages] = useState<ExamPage[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedLevel, setSelectedLevel] = useState<ExamLevel>('N2')
  const [selectedGenre, setSelectedGenre] = useState<ExamGenre>('言語知識')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedExamSize, setSelectedExamSize] = useState<ExamSize>(10)
  const [selectedMode, setSelectedMode] = useState<ExamMode>('mock')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [testResults, setTestResults] = useState<TestResult[]>(() => {
    try {
      const stored = localStorage.getItem(testResultsStorageKey)
      return stored ? JSON.parse(stored) as TestResult[] : []
    } catch {
      return []
    }
  })
  useEffect(() => { localStorage.setItem(testResultsStorageKey, JSON.stringify(testResults)) }, [testResults])
  const currentPage = examPages[questionIndex]
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/categories`)
      .then((response) => response.json())
      .then((data: string[]) => setCategories(data))
      .catch(() => setCategories(categoryDefinitions.map((category) => category.name)))
  }, [])
  useEffect(() => {
    setSelectedCategories(categoriesForSelection(categories, selectedLevel, selectedGenre))
  }, [categories, selectedLevel, selectedGenre])
  useEffect(() => {
    setSelectedExamSize(selectedGenre === '読解' ? 2 : 10)
  }, [selectedGenre])
  const answer = (targetQuestionIndex: number, selection: number[]) => setAnswers((current) => ({ ...current, [targetQuestionIndex]: selection }))
  const goExam = async (nextCategories = selectedCategories, nextExamSize: ExamSize = selectedExamSize) => {
    const params = new URLSearchParams({ categories: nextCategories.join(','), count: String(nextExamSize) })
    const response = await fetch(`${apiBaseUrl}/api/questions/random?${params}`)
    if (!response.ok) {
      let message = '選択した分野の問題数が不足しています'
      try {
        const body = await response.json() as { error?: string }
        if (body?.error) message = body.error
      } catch {
        // noop
      }
      throw new Error(message)
    }
    const questions = await response.json() as Question[]
    if (!questions.length) throw new Error('選択した条件に該当する問題がありません。')
    const readingMode = nextCategories.every((category) => category.includes('読解'))
    setExamQuestions(questions)
    setExamPages(buildExamPages(questions, readingMode))
    setAnswers({})
    setQuestionIndex(0)
    setScreen('exam')
  }
  const login = () => {
    if (loginId === 'test' && loginPassword === 'test') {
      setLoginError('')
      setScreen('dashboard')
      return
    }
    setLoginError('IDまたはパスワードが正しくありません。')
  }
  const finishExam = () => {
    const result: TestResult = { id: `${Date.now()}`, completedAt: new Date().toLocaleString('ja-JP'), mode: selectedMode, questions: examQuestions, answers }
    setTestResults((current) => [result, ...current].slice(0, 3))
    setScreen('result')
  }

  return <><style>{`.main-content > .back-link { display: inline-flex !important; align-items: center; min-height: 38px; padding: 0 14px; border: 1px solid var(--purple); border-radius: 7px; background: #fff; color: var(--purple); font-size: 11px; font-weight: 700; margin-bottom: 18px; }`}</style><div className="app-shell">
    {screen === 'login' ? <Login loginId={loginId} setLoginId={setLoginId} loginPassword={loginPassword} setLoginPassword={setLoginPassword} error={loginError} onLogin={login} /> : <>
      <header className="topbar"><button className="brand" onClick={() => setScreen('dashboard')}><span className="brand-mark">日</span><span>日本語<br /><b>学習アプリ</b></span></button><div className="top-actions"><span className="welcome">学習を続けましょう</span><button className="icon-button" aria-label="通知">♧<i /></button><button className="avatar" aria-label="プロフィール">学</button></div></header>
      <div className="app-body"><aside className="sidebar"><p className="eyebrow">MENU</p><NavItem active={screen === 'dashboard'} icon="⌂" label="ダッシュボード" onClick={() => setScreen('dashboard')} /><NavItem active={screen === 'settings'} icon="▣" label="テストを受ける" onClick={() => setScreen('settings')} /><NavItem active={screen === 'analytics'} icon="◒" label="学習履歴・分析" onClick={() => setScreen('analytics')} /><NavItem active={screen === 'review'} icon="↻" label="復習" onClick={() => setScreen('review')} /><div className="sidebar-bottom"><button className="nav-item"><span>?</span>ヘルプ・使い方</button><button className="nav-item" onClick={() => setScreen('dashboard')}><span>↪</span>ログアウト</button></div></aside>
        <main className="main-content">
          {screen === 'dashboard' && <Dashboard onStart={() => setScreen('settings')} onReview={() => setScreen('review')} />}
          {screen === 'settings' && <Settings2 selectedLevel={selectedLevel} selectedGenre={selectedGenre} selectedCategories={selectedCategories} selectedExamSize={selectedExamSize} selectedMode={selectedMode} onLevelChange={setSelectedLevel} onGenreChange={setSelectedGenre} onExamSizeChange={setSelectedExamSize} onModeChange={setSelectedMode} onBack={() => setScreen('dashboard')} onStart={goExam} />}
          {screen === 'exam' && currentPage && <><Exam3 mode={selectedMode} questions={examQuestions} questionIndexes={currentPage.questionIndexes} index={questionIndex} total={examPages.length} answers={answers} onAnswer={answer} onJump={setQuestionIndex} onNext={() => setQuestionIndex((v) => Math.min(v + 1, examPages.length - 1))} onPrev={() => setQuestionIndex((v) => Math.max(v - 1, 0))} onSubmit={finishExam} pageAnswered={(pageIndex) => examPages[pageIndex]?.questionIndexes.every((questionIdx) => answers[questionIdx] !== undefined) ?? false} />{selectedMode === 'practice' && <button className="finish-test practice-finish" onClick={finishExam}>テストを終了する</button>}</>}
          {screen === 'result' && <Result2 questions={examQuestions} answers={answers} onDashboard={() => setScreen('dashboard')} onReview={() => setScreen('review')} />}
          {screen === 'analytics' && <Analytics onBack={() => setScreen('dashboard')} />}
          {screen === 'review' && <Review2 results={testResults} onBack={() => setScreen('dashboard')} />}
        </main></div>
    </>}
  </div></>
}

function Login({ loginId, setLoginId, loginPassword, setLoginPassword, error, onLogin }: { loginId: string; setLoginId: (v: string) => void; loginPassword: string; setLoginPassword: (v: string) => void; error: string; onLogin: () => void }) { return <div className="login-page"><div className="login-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-copy"><span className="label">JAPANESE STUDY</span><h1>学びを、<br /><em>自信</em>に変える。</h1><p>いつでも、どこでも。あなたのペースで<br />日本語力向上への学習を進めよう。</p></div><div className="floating-card">合格まであと <strong>12</strong> 日</div></div><div className="login-panel"><div className="login-logo"><span className="brand-mark">日</span><span>日本語<b>学習アプリ</b></span></div><div className="login-form"><span className="label">JAPANESE STUDY</span><h2>日本語学習を始めましょう</h2><p>ログインして学習を開始してください。</p><label>ログインID<input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ログインID" type="text" /></label><label>パスワード<input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="パスワード" type="password" /></label>{error && <p className="login-error">{error}</p>}<button className="primary full login-submit" onClick={onLogin}>ログイン <span>→</span></button></div></div></div> }
function NavItem({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span>{label}</button> }
function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="label">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div> }

function Dashboard({ onStart, onReview }: { onStart: () => void; onReview: () => void }) { return <><PageHeading eyebrow="DASHBOARD" title="日本語学習アプリ" description="日本語の学習を始めましょう。" /><div className="dashboard-actions dashboard-actions-simple"><button className="dashboard-action primary-action" onClick={onStart}><strong>テストを始める</strong><span>出題範囲と問題数を設定して開始</span><b>→</b></button><button className="dashboard-action" onClick={onReview}><strong>復習する</strong><span>間違えた問題を確認</span><b>→</b></button></div></> }
function Stat({ icon, title, value, note }: { icon: string; title: string; value: ReactNode; note: ReactNode }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><p>{title}</p><strong>{value}</strong><small>{note}</small></div> }
function PanelHeading({ label, title, action }: { label: string; title: string; action?: ReactNode }) { return <div className="panel-heading"><div><span className="label">{label}</span><h3>{title}</h3></div>{action}</div> }
function Recent({ icon, color, title, meta, score }: { icon: string; color: string; title: string; meta: string; score: string }) { return <div className="recent-item"><span className={`subject-icon ${color}`}>{icon}</span><div><b>{title}</b><p>{meta}</p></div><span className="score">{score}</span></div> }

function Settings(_props: { categories: string[]; selectedCategories: string[]; selectedExamSize: ExamSize; onCategoriesChange: (categories: string[]) => void; onExamSizeChange: (size: ExamSize) => void; onBack: () => void; onStart: (categories: string[], size: ExamSize) => Promise<void> }) { return null }

function Exam({ question, index, total, answers, answeredCount, onAnswer, onJump, onNext, onPrev, onSubmit }: { question: Question; index: number; total: number; answers: Record<number, number>; answeredCount: number; onAnswer: (i: number) => void; onJump: (index: number) => void; onNext: () => void; onPrev: () => void; onSubmit: () => void }) { return <><div className="exam-top"><div><span className="label">MOCK EXAM · 日本語</span><h2>日本語 模擬テスト</h2></div><div className="timer">◷ <strong>60問</strong><span>ランダム出題</span></div></div><div className="exam-progress"><span>問題 {index + 1} / {total}</span><div className="bar"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div><span>{answeredCount}問回答済み</span></div><div className="exam-layout"><section className="panel question-card"><div className="question-meta"><span>Q {String(index + 1).padStart(2, '0')}</span><b>{question.category}</b></div><h3>{question.text}</h3><p className="muted">最も適切なものを1つ選んでください。</p><div className="answer-list">{question.options.map((option, i) => <button className={`answer-option ${answers[index] === i ? 'selected' : ''}`} key={option} onClick={() => onAnswer(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{answers[index] === i && <i>✓</i>}</button>)}</div><div className="question-actions"><button className="secondary" onClick={onPrev} disabled={index === 0}>← 前の問題</button>{index === total - 1 ? <button className="primary" onClick={onSubmit}>テストを提出する <span>→</span></button> : <button className="primary" onClick={onNext}>次の問題 <span>→</span></button>}</div><button className="finish-test" onClick={onSubmit}>テストを終了して採点する</button></section><aside className="question-nav panel"><h3>問題一覧</h3><div className="number-grid">{Array.from({ length: total }, (_, i) => <button className={`${i === index ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`} key={i} onClick={() => onJump(i)} aria-label={`問題${i + 1}へ移動`}>{i + 1}</button>)}</div><div className="legend"><span><i className="dot current-dot" />現在の問題</span><span><i className="dot answered-dot" />回答済み</span></div><button className="finish-test side-finish" onClick={onSubmit}>採点して終了</button></aside></div></> }

function Result({ questions, answers, onDashboard, onReview }: { questions: Question[]; answers: Record<number, number>; onDashboard: () => void; onReview: () => void }) { const correctCount = questions.filter((question, index) => answers[index] === question.correctIndex).length; const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0; const incorrectCount = questions.length - correctCount; return <><PageHeading eyebrow="TEST RESULT" title="テスト結果" description="日本語模擬テスト、おつかれさまでした。" action={<button className="secondary" onClick={onDashboard}>ダッシュボードへ</button>} /><section className="result-hero panel"><div className="result-circle"><strong>{score}<small>%</small></strong><span>目標ライン 70%</span></div><div className="result-message"><span className="label">{score >= 70 ? 'GREAT JOB!' : 'KEEP GOING!'}</span><h3>{score >= 70 ? '目標ラインをクリアしました' : '復習して再挑戦しましょう'}</h3><p>CSVに登録された正解と、あなたの回答を照合した結果です。</p><div className="result-stats"><span><b>{correctCount}</b>正解</span><span><b>{incorrectCount}</b>不正解</span><span><b>{Object.keys(answers).length}</b>回答済み</span></div></div></section><div className="result-columns"><section className="panel"><PanelHeading label="SUBJECT SCORE" title="分野別の結果" />{categoryDefinitions.map((category) => { const categoryQuestions = questions.filter((question) => question.category === category.name); const categoryCorrect = categoryQuestions.filter((question) => questions.indexOf(question) >= 0 && answers[questions.indexOf(question)] === question.correctIndex).length; const categoryScore = categoryQuestions.length ? Math.round((categoryCorrect / categoryQuestions.length) * 100) : 0; return <div className="subject-result" key={category.name}><span>{category.name}</span><div className="bar"><i style={{ width: `${categoryScore}%` }} /></div><b>{categoryScore}%</b></div> })}</section><section className="panel result-next"><span className="label">NEXT STEP</span><h3>間違えた問題を復習</h3><p>{incorrectCount}問の不正解問題を復習して、日本語の知識を定着させましょう。</p><button className="primary" onClick={onReview}>復習を始める <span>→</span></button></section></div><ExplanationList questions={questions} answers={answers} /></> }
function ExplanationList({ questions, answers }: { questions: Question[]; answers: Record<number, number> }) { const incorrect = questions.filter((question, index) => answers[index] !== question.correctIndex); return <section className="panel explanation-panel"><PanelHeading label="EXPLANATION" title="問題の解説" /><p className="muted">不正解または未回答の問題を表示しています。</p>{incorrect.slice(0, 3).map((question, index) => <div className="explanation-item" key={question.text}><b>Q {index + 1} · {question.category}</b><p>{question.explanation || '解説未登録'}</p></div>)}</section> }
function Analytics({ onBack }: { onBack: () => void }) { return <><button className="back-link" onClick={onBack}>← ダッシュボードに戻る</button><PageHeading eyebrow="LEARNING ANALYTICS" title="学習履歴・分析" description="学習の積み重ねを振り返り、次の一歩を見つけましょう。" /><div className="analytics-grid"><section className="panel chart-card"><PanelHeading label="WEEKLY ACTIVITY" title="週間学習時間" action={<select><option>今週</option></select>} /><div className="chart"><div className="y-labels"><span>4h</span><span>3h</span><span>2h</span><span>1h</span><span>0h</span></div><div className="bars">{['月','火','水','木','金','土','日'].map((day, i) => <div className="bar-column" key={day}><div className="chart-bar" style={{ height: `${[48, 72, 58, 86, 62, 40, 20][i]}%` }} /><span>{day}</span></div>)}</div></div></section><section className="panel weakness"><span className="label">FOCUS AREAS</span><h3>重点的に学ぶ分野</h3><p className="muted">正答率が低い順に表示しています。</p>{[['01','語彙・漢字','60%','60%'],['02','文法・読解','75%','75%']].map(([no, name, width, score]) => <div className="focus-item" key={no}><span className="focus-number">{no}</span><div><b>{name}</b><div className="bar"><i style={{ width }} /></div></div><strong>{score}</strong></div>)}</section></div></> }
function Review({ questions, answers, onBack }: { questions: Question[]; answers: Record<number, number>; onBack: () => void }) { const incorrect = questions.filter((question, index) => answers[index] !== question.correctIndex); return <><button className="back-link" onClick={onBack}>← ダッシュボードに戻る</button><PageHeading eyebrow="REVIEW" title="復習" description="間違えた問題を振り返って、日本語の知識を定着させましょう。" action={<span className="review-count">未復習 {incorrect.length}問</span>} /><div className="review-tabs"><button className="active">間違えた問題 <b>{incorrect.length}</b></button><button>あとで復習 <b>0</b></button><button>すべての問題</button></div><div className="review-list">{incorrect.length ? incorrect.map((question, index) => <ReviewItem key={question.text} no={String(index + 1).padStart(2, '0')} category={question.category} question={question.text} wrong={answers[questions.indexOf(question)] === undefined ? '未回答' : question.options[answers[questions.indexOf(question)]]} right={question.options[question.correctIndex ?? 0]} explanation={question.explanation} />) : <section className="panel"><p className="muted">現在、復習対象の問題はありません。</p></section>}</div></> }
function ReviewItem({ no, category, question, wrong, right, explanation }: { no: string; category: string; question: string; wrong: string; right: string; explanation?: string }) { return <div className="review-item panel"><div className="review-number">Q {no}</div><div className="review-body"><span className="label">{category}</span><h3>{question}</h3><div className="answer-line wrong">あなたの回答：{wrong}</div><div className="answer-line right">正解：{right}</div><p className="muted">解説：{explanation || '解説未登録'}</p></div><button className="secondary">解説を見る →</button></div> }
void Stat
void Settings
void Exam
void Recent
void Exam2
void Result
void Review
export default App
