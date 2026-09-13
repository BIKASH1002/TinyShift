import React, { useState } from 'react';
import { Anchor, ArrowRight, Leaf, NotebookPen, Sprout, Zap } from 'lucide-react';
import { Button } from '../components/ui';
import './OnboardingScreen.css';
export const OnboardingScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  const [energy, setEnergy] = useState<'low' | 'good'>('good');
  return (
    <div className="welcome">
      <section className="welcome-copy">
        <p className="welcome-badge">
          <Sprout size={14} aria-hidden="true" />A gentler approach to building habits
        </p>
        <h1>
          Small steps.
          <br />
          <em>Room for real life.</em>
        </h1>
        <p className="welcome-intro">
          Some days you have more to give. Some days, less. Build a routine that makes space for
          both, with a tiny version of every habit.
        </p>
        <Button onClick={onGetStarted}>
          Get started <ArrowRight size={17} aria-hidden="true" />
        </Button>
        <details className="welcome-explainer">
          <summary>How does TinyShift adapt?</summary>
          <p>
            Your energy, available time and recent check-ins help us suggest a usual or tiny step.
            Review patterns each week and choose which changes to accept. AI is optional, and you
            stay in control.
          </p>
        </details>
      </section>
      <section id="how-it-works" className="welcome-showcase" aria-label="How TinyShift works">
        <div className="welcome-example-heading">
          <p className="eyebrow">A small step, made practical</p>
          <span className="pill">Example habit</span>
        </div>
        <article className="welcome-example">
          <h2>Make time for evening reading</h2>
          <p className="welcome-example-cue">After brushing your teeth at night</p>
          <div
            className="welcome-energy"
            role="group"
            aria-label="Choose energy for the example habit"
          >
            <button
              type="button"
              aria-pressed={energy === 'low'}
              aria-controls="welcome-habit-preview"
              onClick={() => setEnergy('low')}
            >
              <Leaf size={14} aria-hidden="true" />
              <span>
                Low energy <small>(Tiny step)</small>
              </span>
            </button>
            <button
              type="button"
              aria-pressed={energy === 'good'}
              aria-controls="welcome-habit-preview"
              onClick={() => setEnergy('good')}
            >
              <Zap size={14} aria-hidden="true" />
              <span>
                Good energy <small>(Usual step)</small>
              </span>
            </button>
          </div>
          <div
            id="welcome-habit-preview"
            className="welcome-versions"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className={energy === 'low' ? 'welcome-tiny-step' : undefined}>
              <span className="welcome-version-label">
                {energy === 'low' ? 'Your tiny step' : 'Your usual step'}
              </span>
              <h3>{energy === 'low' ? 'Read one page' : 'Read for 10 minutes'}</h3>
              <p>
                {energy === 'low'
                  ? 'A smaller way to show up on a difficult day.'
                  : 'When you have the time and energy to settle in.'}
              </p>
            </div>
          </div>
          <p className="welcome-example-note">
            Both count. This is an example, so nothing is saved.
          </p>
        </article>
        <ol className="welcome-steps">
          <li>
            <Anchor size={23} aria-hidden="true" />
            <div>
              <h2>Start with a familiar moment</h2>
              <small>
                After breakfast. Before bed. Let something you already do be your reminder.
              </small>
            </div>
          </li>
          <li>
            <Leaf size={23} aria-hidden="true" />
            <div>
              <h2>Make the step fit your day</h2>
              <small>A whole chapter or just one page. Both are ways to show up.</small>
            </div>
          </li>
          <li>
            <NotebookPen size={23} aria-hidden="true" />
            <div>
              <h2>Notice. Adjust. Keep going.</h2>
              <small>Learn from your check-ins, without turning a missed day into a failure.</small>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
};
