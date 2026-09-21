import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300">
        <ArrowLeft className="size-4" /> Back to home
      </Link>
      <h1 className="font-display text-3xl font-semibold text-base-50">Privacy Policy</h1>
      <p className="mt-2 text-sm text-base-400">Last updated {new Date().getFullYear()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-base-300">
        <p>
          Communication Coach is a student/portfolio project built to demonstrate an adaptive communication and
          interview-coaching platform. This page describes, in plain terms, what data the demo collects and how it's used.
        </p>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">What we collect</h2>
          <p className="mt-2">
            When you sign up, we store your name, email, college, course, career goal, and the scores generated from your
            practice sessions (grammar, vocabulary, fluency, pace, filler words, confidence, pronunciation and response
            structure). Voice recordings are analyzed to produce a transcript and speech metrics; the analysis runs against
            a real speech-to-text and NLP pipeline where available.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">How it's used</h2>
          <p className="mt-2">
            Your scores and practice history power the adaptive learning plan, weakness detection and revision queue you
            see in the app — that's the entire purpose of collecting it. Nothing here is sold or shared with third parties.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">Data storage</h2>
          <p className="mt-2">
            In this demo deployment, data is stored locally by the backend service and is not distributed further. If you'd
            like your data removed, contact the project maintainer.
          </p>
        </section>
      </div>
    </div>
  );
}
