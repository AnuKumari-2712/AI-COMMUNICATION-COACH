import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300">
        <ArrowLeft className="size-4" /> Back to home
      </Link>
      <h1 className="font-display text-3xl font-semibold text-base-50">Terms of Service</h1>
      <p className="mt-2 text-sm text-base-400">Last updated {new Date().getFullYear()}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-base-300">
        <p>
          Communication Coach is provided as a demonstration project for educational and portfolio purposes. By creating
          an account, you agree to the following terms.
        </p>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">Use of the platform</h2>
          <p className="mt-2">
            The platform is intended for practicing communication, grammar, vocabulary and interview skills. AI-generated
            feedback is a learning aid, not a certified assessment of your abilities, and should not be treated as
            professional or academic evaluation.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">No warranty</h2>
          <p className="mt-2">
            This is a demo application provided "as is," without warranty of any kind. Scores, transcripts and
            recommendations may occasionally fall back to representative sample data when a real analysis service is
            unavailable — the interface always labels which is which.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-base-50">Account & data</h2>
          <p className="mt-2">
            You're responsible for the accuracy of the information you provide at signup. You may request deletion of
            your account and associated data at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
