"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  GraduationCap,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Info,
  Clock3,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ═══════════════════════════════════════════════════════════════
// EDIT THIS SECTION when details change.
// ═══════════════════════════════════════════════════════════════
const COMMUNITY_NAME = "YCBN Foundation Bible School";
const EXAM_TITLE = "Foundation Class — Practical Scenario Questions";
const LOGO_SRC = "/logo.png";
const ADMIN_PASSCODE_HINT = ""; // no local passcode check anymore — see note below

// Exam window (WAT / GMT+1)
const EXAM_START = new Date("2026-08-03T00:00:00+01:00"); // Mon 3 Aug, 12:00 AM
const EXAM_END = new Date("2026-08-07T23:59:00+01:00"); // Fri 7 Aug, 11:59 PM

const EXAM_INSTRUCTIONS = [
  "Use as many biblical illustrations, sources, and materials as you can. Be creative.",
  "Scores are graded on thoroughness and use of scriptural reference.",
  "All questions are compulsory.",
  "You can move back and forth between questions, and come back later — your answers stay on this device until you submit.",
];

const QUESTIONS = [
  {
    id: "q1",
    label: "The New Birth",
    scenario:
      'Chinedu grew up in church, was baptized as a child, sings in the choir, and knows many Bible verses. However, when asked how he became a Christian, he says, "I\'ve always been one because my parents are Christians."',
    prompt:
      "Based on the teaching on the New Birth, how would you explain to Chinedu what it truly means to be born again? What Scriptures would you use?",
  },
  {
    id: "q2",
    label: "The New Creation",
    scenario:
      'Ada recently gave her life to Christ. Although she has stopped many sinful habits, she constantly says, "I\'m still the same old sinner. Nothing has really changed inside me."',
    prompt:
      "Using the doctrine of the New Creation, how would you help Ada understand her new identity in Christ and distinguish between her spirit, mind, and actions?",
  },
  {
    id: "q3",
    label: "Righteousness",
    scenario:
      'After losing his temper and insulting a colleague, David becomes convinced that God no longer accepts him. He refuses to pray for several days because he feels "too dirty" to approach God.',
    prompt:
      "How would you use the doctrine of righteousness in Christ to counsel David while still encouraging him to repent?",
  },
  {
    id: "q4",
    label: "Speaking in Tongues",
    scenario:
      'During a fellowship meeting, several new believers notice others praying in tongues. One of them says, "I don\'t think I have the Holy Spirit because I cannot speak in tongues."',
    prompt:
      "How would you explain the relationship between the indwelling Holy Spirit and speaking in tongues, and encourage the believer biblically?",
  },
  {
    id: "q5",
    label: "The Indwelling of the Holy Spirit",
    scenario:
      'Grace is about to write a difficult examination. She says, "I wish Jesus were physically here to help me because I feel alone."',
    prompt:
      "From the teaching on the indwelling of the Holy Spirit, how would you reassure Grace that God is with her and in her?",
  },
  {
    id: "q6",
    label: "The Local Church",
    scenario:
      'Michael says, "I watch sermons online every day. I don\'t see any reason to belong to a local church since I can learn everything from YouTube."',
    prompt:
      "Based on the teaching on the Local Church, explain why every believer should actively belong to and serve in a local church.",
  },
  {
    id: "q7",
    label: "The Love of God",
    scenario:
      'After losing his job, Samuel concludes, "If God truly loved me, this wouldn\'t have happened."',
    prompt:
      "Using the teaching on the Love of God, explain why difficult circumstances do not determine whether God loves us.",
  },
  {
    id: "q8",
    label: "Christian Fellowship",
    scenario:
      'Esther believes she can grow spiritually without interacting with other believers. She rarely attends fellowship meetings because she prefers to "walk with God alone."',
    prompt:
      "Explain the importance of fellowship with other believers and the role of the local church in spiritual growth.",
  },
  {
    id: "q9",
    label: "Identity in Christ",
    scenario:
      'A university student constantly introduces himself by saying, "I\'m naturally weak, fearful, and I can never overcome temptation because that\'s just who I am."',
    prompt:
      "How would you use the truths about the New Creation and the believer's identity in Christ to correct his thinking and help him see himself as God does?",
  },
  {
    id: "q10",
    label: "Living Out the Gospel",
    scenario:
      'A new believer receives Christ but continues cheating customers in his business because he says, "God has forgiven me already, so my actions don\'t really matter."',
    prompt:
      "Using the teachings on the New Birth, New Creation, and the Lordship of Christ, explain why genuine salvation produces a transformed lifestyle without making good works the basis of salvation.",
  },
];
// ═══════════════════════════════════════════════════════════════

// ── storage layer ────────────────────────────────────────────
// Submissions go straight to Supabase from the browser using the
// anon key (RLS only allows INSERT, so this is safe).
// Reading responses back happens through /api/admin/responses,
// which checks the passcode SERVER-SIDE before using the service
// role key. The passcode itself lives in Vercel's env vars now,
// not in this file — see .env.local.example.
async function saveResponse(record) {
  const { error } = await supabase.from("exam_responses").insert({
    name: record.name,
    university: record.university,
    phone: record.phone,
    email: record.email,
    discipleship_group: record.discipleshipGroup,
    answers: record.answers,
  });
  return !error;
}

async function fetchAllResponses(passcode) {
  const res = await fetch("/api/admin/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  const { responses } = await res.json();
  return responses;
}
// ──────────────────────────────────────────────────────────────

function getExamPhase(now) {
  if (now < EXAM_START) return "before";
  if (now > EXAM_END) return "closed";
  return "open";
}

function fmtCountdown(ms) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

const DATE_FMT = { weekday: "long", month: "long", day: "numeric" };
const TIME_FMT = { hour: "numeric", minute: "2-digit" };
function fmtFullDate(d) {
  return `${d.toLocaleDateString(undefined, DATE_FMT)}, ${d.toLocaleTimeString(
    undefined,
    TIME_FMT
  )}`;
}

function Mark({ size = 56 }) {
  return (
    <div className="mark" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt={`${COMMUNITY_NAME} logo`} />
    </div>
  );
}

export default function FaithExamPage() {
  const [screen, setScreen] = useState("intake");
  const [transitionKey, setTransitionKey] = useState(0);

  const [form, setForm] = useState({
    name: "",
    university: "",
    phone: "",
    email: "",
    discipleshipGroup: "",
  });
  const [formTouched, setFormTouched] = useState(false);

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const [now, setNow] = useState(new Date());
  const timerRef = useRef(null);
  const finishedRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminChecking, setAdminChecking] = useState(false);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const formValid =
    form.name.trim().length > 1 &&
    form.university.trim().length > 1 &&
    form.phone.trim().length > 3 &&
    form.email.trim().includes("@") &&
    form.discipleshipGroup.trim().length > 0;

  const finishExam = useCallback(
    async (finalAnswers) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      clearInterval(timerRef.current);
      setScreen("done");
      setSaving(true);
      setSaveError(false);
      try {
        const record = {
          name: form.name.trim(),
          university: form.university.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          discipleshipGroup: form.discipleshipGroup.trim(),
          answers: finalAnswers,
        };
        const ok = await saveResponse(record);
        if (!ok) setSaveError(true);
      } catch (e) {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    },
    [form]
  );

  // ticks the deadline countdown while the exam is on screen
  useEffect(() => {
    if (screen !== "exam") return;
    timerRef.current = setInterval(() => {
      const n = new Date();
      setNow(n);
      if (n > EXAM_END) {
        clearInterval(timerRef.current);
        finishExam(answers);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function goTo(nextIndex) {
    setTransitionKey((k) => k + 1);
    setQIndex(nextIndex);
  }

  function handleNext() {
    if (qIndex + 1 < QUESTIONS.length) {
      goTo(qIndex + 1);
    } else {
      finishExam(answers);
    }
  }

  async function handleAdminEnter() {
    setAdminChecking(true);
    setAdminError("");
    try {
      const items = await fetchAllResponses(adminCode);
      setResponses(items);
      setScreen("admin");
    } catch (e) {
      setAdminError(e.message === "Incorrect passcode" ? "Incorrect passcode." : "Something went wrong.");
    } finally {
      setAdminChecking(false);
    }
  }

  async function refreshResponses() {
    setLoadingResponses(true);
    try {
      const items = await fetchAllResponses(adminCode);
      setResponses(items);
    } catch (e) {
      // if the passcode became invalid mid-session, bounce back to the gate
      setScreen("admin-gate");
    } finally {
      setLoadingResponses(false);
    }
  }

  const phase = getExamPhase(now);
  const msToEnd = EXAM_END - now;
  const totalWindowMs = EXAM_END - EXAM_START;
  const elapsedPct = Math.min(
    100,
    Math.max(0, ((now - EXAM_START) / totalWindowMs) * 100)
  );
  const urgent = msToEnd < 1000 * 60 * 60 * 6; // last 6 hours
  const currentQ = QUESTIONS[qIndex];

  return (
    <div className="wrap">
      <div className="ambient a1" />
      <div className="ambient a2" />
      <div className="ambient a3" />

      <div className="stage">
        <div className="brandrow">
          <Mark />
          <div className="brandtext">
            <div className="eyebrow">{COMMUNITY_NAME}</div>
            <div className="brandtitle">{EXAM_TITLE}</div>
          </div>
        </div>

        <div className="card glass" key={screen}>
          {screen === "intake" && (
            <div className="section">
              <h1>Let&apos;s get you registered</h1>
              <p className="lede">
                Before you begin, tell us who you are. Your leaders will
                review your answers after you submit.
              </p>

              <div className="field">
                <label>
                  <User size={14} /> Full name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="field">
                <label>
                  <GraduationCap size={14} /> University
                </label>
                <input
                  value={form.university}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, university: e.target.value }))
                  }
                  placeholder="University of Lagos"
                />
              </div>
              <div className="row2">
                <div className="field">
                  <label>
                    <Phone size={14} /> Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="field">
                  <label>
                    <Mail size={14} /> Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="field">
                <label>
                  <Users size={14} /> Discipleship Group (1–7)
                </label>
                <input
                  value={form.discipleshipGroup}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discipleshipGroup: e.target.value,
                    }))
                  }
                  placeholder="e.g. 3 — or NIL if not applicable to you"
                />
              </div>

              <button
                className="btn primary"
                disabled={!formValid}
                onClick={() => {
                  setFormTouched(true);
                  if (formValid) setScreen("ready");
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
              {formTouched && !formValid && (
                <p className="warn">Please fill in every field to continue.</p>
              )}
              <p className="fineprint">
                Visible to {COMMUNITY_NAME} leadership reviewing this
                assessment.
              </p>
            </div>
          )}

          {screen === "ready" && (
            <div className="section center">
              <div className="ready-badge">
                <Info size={20} />
              </div>
              <h1>Are you ready to take the test?</h1>

              {phase === "before" && (
                <p className="lede">
                  This exam opens <strong>{fmtFullDate(EXAM_START)}</strong>.
                  Come back then to begin.
                </p>
              )}
              {phase === "closed" && (
                <p className="lede">
                  This exam closed on <strong>{fmtFullDate(EXAM_END)}</strong>.
                  Please reach out to a leader if you still need to submit.
                </p>
              )}
              {phase === "open" && (
                <p className="lede">Here&apos;s what to expect before you start.</p>
              )}

              <ul className="details">
                <li>
                  <span className="detail-k">Questions</span>
                  <span className="detail-v">{QUESTIONS.length}</span>
                </li>
                <li>
                  <span className="detail-k">Closes</span>
                  <span className="detail-v">{fmtFullDate(EXAM_END)}</span>
                </li>
              </ul>
              <ul className="instructions">
                {EXAM_INSTRUCTIONS.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <button
                className="btn primary"
                onClick={() => setScreen("exam")}
                disabled={phase !== "open"}
              >
                Begin the exam <ArrowRight size={16} />
              </button>
            </div>
          )}

          {screen === "exam" && (
            <div className="section">
              <div className="timebar-wrap">
                <div className="timebar-top">
                  <span className="qcount">
                    Question {qIndex + 1} of {QUESTIONS.length}
                  </span>
                  <span className={`timepill ${urgent ? "urgent" : ""}`}>
                    <Clock3 size={13} /> {fmtCountdown(msToEnd)} left
                  </span>
                </div>
                <div className="timebar-track">
                  <div
                    className={`timebar-fill ${urgent ? "urgent" : ""}`}
                    style={{ width: `${elapsedPct}%` }}
                  />
                </div>
              </div>

              <div className="qcard" key={transitionKey}>
                <div className="qlabel">{currentQ.label}</div>
                <p className="scenario">{currentQ.scenario}</p>
                <h2 className="qtext">{currentQ.prompt}</h2>

                <textarea
                  className="answer-box"
                  rows={8}
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                  placeholder="Write your answer here, with scripture references…"
                />
              </div>

              <div className="navrow">
                <button
                  className="btn ghost"
                  onClick={() => qIndex > 0 && goTo(qIndex - 1)}
                  disabled={qIndex === 0}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button className="btn primary" onClick={handleNext}>
                  {qIndex + 1 === QUESTIONS.length ? "Submit" : "Next"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {screen === "done" && (
            <div className="section center">
              <div className="done-badge">
                <CheckCircle2 size={26} />
              </div>
              <h1>Thank you, {form.name.split(" ")[0] || "friend"}.</h1>
              <p className="lede">
                Your answers have been submitted for review.
                {saving && " Saving…"}
                {saveError &&
                  " We had trouble saving your response — please let a leader know."}
              </p>
            </div>
          )}

          {screen === "admin-gate" && (
            <div className="section center">
              <div className="ready-badge">
                <Lock size={20} />
              </div>
              <h1>Leader access</h1>
              <div className="field" style={{ width: "100%" }}>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => {
                    setAdminCode(e.target.value);
                    setAdminError("");
                  }}
                  placeholder="Passcode"
                />
              </div>
              <button
                className="btn primary"
                onClick={handleAdminEnter}
                disabled={adminChecking || !adminCode}
              >
                {adminChecking ? "Checking…" : "Enter"} <ArrowRight size={16} />
              </button>
              {adminError && <p className="warn">{adminError}</p>}
            </div>
          )}

          {screen === "admin" && (
            <div className="section">
              <div className="timebar-top">
                <span className="qcount">
                  <ShieldCheck size={14} style={{ marginRight: 6 }} />
                  {responses.length} response
                  {responses.length === 1 ? "" : "s"}
                </span>
                <button className="link-btn" onClick={refreshResponses}>
                  Refresh
                </button>
              </div>
              {loadingResponses && <p className="lede">Loading…</p>}
              {!loadingResponses && responses.length === 0 && (
                <p className="lede">No responses submitted yet.</p>
              )}
              <div className="responses">
                {responses.map((r) => (
                  <div className="response-card" key={r.id}>
                    <div className="response-head">
                      <strong>{r.name}</strong>
                      <span className="meta">
                        {new Date(r.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="meta">
                      {r.university} · {r.phone} · {r.email} · Group:{" "}
                      {r.discipleship_group || "—"}
                    </div>
                    <div className="answers">
                      {QUESTIONS.map((q) => (
                        <div className="answer-row" key={q.id}>
                          <div className="answer-q">
                            {q.label} — {q.prompt}
                          </div>
                          <div className="answer-a">
                            {(r.answers && r.answers[q.id]) || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {screen !== "admin" && screen !== "admin-gate" && (
          <button
            className="link-btn footer-link"
            onClick={() => setScreen("admin-gate")}
          >
            Leader access
          </button>
        )}
      </div>

      <style jsx global>{`
        :root {
          --bg: #0a0611;
          --bg2: #120a1f;
          --accent1: #ff3ea0;
          --accent2: #8b2ff7;
          --accent-grad: linear-gradient(135deg, var(--accent1), var(--accent2));
          --glass-bg: rgba(255, 255, 255, 0.055);
          --glass-bg-strong: rgba(255, 255, 255, 0.09);
          --glass-border: rgba(255, 255, 255, 0.14);
          --text: #f5f1fa;
          --text-dim: #b6adc4;
          --danger: #ff5470;
        }
        * {
          box-sizing: border-box;
        }
        .wrap {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at 50% -10%, var(--bg2), var(--bg) 60%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
            Inter, Roboto, sans-serif;
          color: var(--text);
        }
        .ambient {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.55;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .a1 {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, var(--accent2), transparent 70%);
          top: -160px;
          left: -120px;
          animation: float1 16s ease-in-out infinite alternate;
        }
        .a2 {
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, var(--accent1), transparent 70%);
          bottom: -140px;
          right: -100px;
          animation: float2 18s ease-in-out infinite alternate;
        }
        .a3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #4f6bff, transparent 70%);
          top: 40%;
          right: 10%;
          opacity: 0.3;
          animation: float3 22s ease-in-out infinite alternate;
        }
        @keyframes float1 {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(40px, 60px) scale(1.1);
          }
        }
        @keyframes float2 {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(-30px, -50px) scale(1.08);
          }
        }
        @keyframes float3 {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-60px, 40px);
          }
        }

        .stage {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .brandrow {
          display: flex;
          align-items: center;
          gap: 14px;
          align-self: flex-start;
          padding-left: 4px;
        }
        .mark {
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 6px 24px rgba(139, 47, 247, 0.45);
          overflow: hidden;
        }
        .mark img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .eyebrow {
          font-size: 11.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .brandtitle {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .card.glass {
          width: 100%;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 26px;
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          padding: 30px 26px;
          animation: cardIn 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .section.center {
          align-items: center;
          text-align: center;
        }
        h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.015em;
        }
        h2 {
          font-size: 17px;
          font-weight: 650;
          margin: 0;
        }
        .lede {
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-dim);
          margin: 0;
        }

        .ready-badge,
        .done-badge {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: var(--glass-bg-strong);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .done-badge {
          color: #6ee7a8;
        }
        .ready-badge {
          color: var(--accent1);
        }

        .details {
          list-style: none;
          padding: 0;
          margin: 4px 0;
          display: flex;
          gap: 10px;
          width: 100%;
        }
        .details li {
          flex: 1;
          background: var(--glass-bg-strong);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-k {
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-dim);
        }
        .detail-v {
          font-size: 14px;
          font-weight: 700;
        }

        .instructions {
          text-align: left;
          margin: 4px 0;
          padding-left: 18px;
          color: var(--text-dim);
          font-size: 13px;
          line-height: 1.7;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .row2 {
          display: flex;
          gap: 10px;
        }
        .row2 .field {
          flex: 1;
        }
        .field label {
          font-size: 12px;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        input,
        textarea {
          font-family: inherit;
          font-size: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        input::placeholder,
        textarea::placeholder {
          color: rgba(245, 241, 250, 0.35);
        }
        input:focus,
        textarea:focus {
          outline: none;
          border-color: var(--accent1);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(255, 62, 160, 0.15);
        }

        .btn {
          font-family: inherit;
          font-size: 14px;
          font-weight: 650;
          padding: 12px 20px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease,
            opacity 160ms ease, background 200ms ease;
        }
        .btn.primary {
          background: var(--accent-grad);
          color: #fff;
          box-shadow: 0 8px 24px rgba(139, 47, 247, 0.35);
        }
        .btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(139, 47, 247, 0.45);
        }
        .btn.primary:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
        }
        .btn.ghost {
          background: var(--glass-bg-strong);
          color: var(--text);
          border: 1px solid var(--glass-border);
        }
        .btn.ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
        }
        .btn.ghost:active:not(:disabled) {
          transform: scale(0.97);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .section.center .btn {
          align-self: center;
        }

        .warn {
          font-size: 12.5px;
          color: var(--danger);
          margin: 0;
        }
        .fineprint {
          font-size: 11px;
          color: rgba(182, 173, 196, 0.7);
          margin-top: 2px;
        }

        .timebar-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .timebar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .qcount {
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .timepill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 700;
          background: var(--glass-bg-strong);
          border: 1px solid var(--glass-border);
          padding: 5px 11px;
          border-radius: 20px;
          transition: background 300ms ease, color 300ms ease;
        }
        .timepill.urgent {
          background: var(--danger);
          color: #fff;
          border-color: transparent;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .timebar-track {
          height: 6px;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }
        .timebar-fill {
          height: 100%;
          border-radius: 4px;
          background: var(--accent-grad);
          transition: width 1000ms linear;
        }
        .timebar-fill.urgent {
          background: var(--danger);
        }

        .qcard {
          padding: 4px 0 2px;
          animation: qIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @keyframes qIn {
          from {
            opacity: 0;
            transform: translateX(14px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .qlabel {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent1);
        }
        .scenario {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-dim);
          font-style: italic;
          margin: 0;
          border-left: 2px solid var(--glass-border);
          padding-left: 12px;
        }
        .qtext {
          line-height: 1.4;
          margin: 2px 0 4px;
        }

        .answer-box {
          resize: vertical;
        }

        .navrow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 4px;
        }

        .link-btn {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 160ms ease;
        }
        .link-btn:hover {
          color: var(--text);
        }
        .footer-link {
          opacity: 0.7;
        }

        .responses {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 4px;
        }
        .response-card {
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.04);
        }
        .response-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 14px;
        }
        .meta {
          font-size: 11.5px;
          color: var(--text-dim);
          margin-top: 2px;
        }
        .answers {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .answer-row {
          font-size: 12.5px;
        }
        .answer-q {
          color: var(--text-dim);
        }
        .answer-a {
          color: var(--text);
          font-weight: 600;
          white-space: pre-wrap;
        }

        @media (max-width: 480px) {
          .row2 {
            flex-direction: column;
          }
          .details {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
