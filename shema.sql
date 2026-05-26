-- =========================
-- ISEKAI SKILL ENGINE DDL
-- PostgreSQL Clean Version
-- =========================

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- =========================
-- CAREER GOALS
-- =========================
CREATE TABLE career_goals (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- =========================
-- USER <-> CAREER GOAL
-- =========================
CREATE TABLE user_goals (
    user_id UUID NOT NULL,
    career_goal_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, career_goal_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (career_goal_id) REFERENCES career_goals(id) ON DELETE CASCADE
);

-- =========================
-- SKILLS (HIERARCHY)
-- =========================
CREATE TABLE skills (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id UUID NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES skills(id) ON DELETE SET NULL
);

-- =========================
-- CAREER GOAL <-> SKILL
-- =========================
CREATE TABLE career_goal_skills (
    career_goal_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (career_goal_id, skill_id),
    FOREIGN KEY (career_goal_id) REFERENCES career_goals(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- =========================
-- JOURNALS
-- =========================
CREATE TABLE journals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- PROJECTS
-- =========================
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    report_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- QUIZZES
-- =========================
CREATE TABLE quizzes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- =========================
-- QUESTIONS
-- =========================
CREATE TABLE questions (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- =========================
-- QUIZ ATTEMPTS
-- =========================
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL,
    user_id UUID NOT NULL,
    score INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- QUIZ ANSWERS
-- =========================
CREATE TABLE quiz_answers (
    id UUID PRIMARY KEY,
    quiz_attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN,
    score INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- =========================
-- SKILL EVENTS (CORE ENGINE)
-- =========================
CREATE TABLE skill_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (
        source_type IN ('JOURNAL', 'PROJECT', 'QUIZ')
    ),
    source_id UUID NOT NULL,
    contribution INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- =========================
-- USER SKILLS (AGGREGATE)
-- =========================
CREATE TABLE user_skills (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP,
    UNIQUE (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);
