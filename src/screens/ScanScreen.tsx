/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, QrCode, Smartphone, History, Settings, CheckCircle2, Sliders } from 'lucide-react';
import { LinkedObject, Habit } from '../types';

interface ScanScreenProps {
  recentObjects: LinkedObject[];
  onMockScanSuccess: (habitId: string, objectName: string) => void;
  habits: Habit[];
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  recentObjects,
  onMockScanSuccess,
  habits,
}) => {
  const [useCamera, setUseCamera] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera preview if requested and permission allows
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (useCamera) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('Camera access error or iframe environment limit:', err);
          setUseCamera(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [useCamera]);

  const triggerSimulatedScan = (obj: LinkedObject) => {
    // Perform simulated tag scan
    setSuccessAnimation(`Successfully scanned tag for ${obj.name}!`);
    setTimeout(() => {
      onMockScanSuccess(obj.habitId, obj.name);
      setSuccessAnimation(null);
    }, 1800);
  };

  return (
    <div className="min-h-full bg-[#FDFBF7] px-5 pt-4 pb-32 overflow-y-auto animate-fade-in space-y-6 relative">
      {/* Dynamic Scanned feedback banner overlay */}
      {successAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs mx-auto space-y-4 shadow-2xl border border-surface-container-high scale-in">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Tag Scan Complete!</h3>
              <p className="text-xs text-on-surface-variant font-medium">{successAnimation}</p>
            </div>
            <p className="text-xxs text-primary font-bold">Streak count increased • +1 win</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
              alt="Ananya Profile tiny"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-extrabold text-lg text-primary">DayTag</h1>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner Prompt */}
      <div className="text-center max-w-xs mx-auto">
        <h2 className="font-headline-lg-mobile text-xl md:text-2xl font-bold text-on-surface tracking-tight mb-1">
          Scan NFC or QR Tag
        </h2>
        <p className="text-xs font-body-md text-on-surface-variant leading-relaxed">
          Turn everyday household objects into dynamic habit controls.
        </p>
      </div>

      {/* Code Scanner Frame Viewport container */}
      <div className="relative w-full max-w-[280px] aspect-square mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white select-none">
        {/* Animated Scanning Tracker lines */}
        <div className="absolute top-0 bottom-0 left-4 right-4 z-10 pointer-events-none">
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-primary-container to-transparent rounded-full shadow-lg h-1 absolute left-0 right-0 animate-pulse" style={{ animationDuration: '2s' }} />
        </div>

        {/* Framing corner brackets overlay */}
        <div className="absolute inset-0 z-20 border-[4px] border-white/40 pointer-events-none rounded-2xl">
          <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
        </div>

        {/* Real video element OR premium mock graphic overlay */}
        {useCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center relative p-4 text-center">
            <img
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=300&q=80"
              alt="Scanning context overlay"
              className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-3 z-10">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center text-primary mx-auto shadow-sm">
                <Camera className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface">Simulated Capture Layer</p>
                <p className="text-[10px] text-on-surface-variant max-w-[180px] mx-auto leading-relaxed">
                  Click 'Tap NFC' below, or tap a recent object to execute a tracking action.
                </p>
              </div>
              <button
                onClick={() => setUseCamera(true)}
                className="px-4 py-2 bg-primary/10 text-primary rounded-full text-xxs font-bold active:scale-95 transition-all outline-none"
              >
                Access Device Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Control buttons */}
      <div className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto w-full">
        <button
          onClick={() => {
            const qrObj = recentObjects.find(o => o.type === 'QR') || recentObjects[0];
            triggerSimulatedScan(qrObj);
          }}
          className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl border border-surface-container shadow-sm hover:bg-surface-container-low transition-all active:scale-95 gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <QrCode className="w-5 h-5 stroke-2" />
          </div>
          <span className="text-xs font-bold text-on-surface">Scan QR Code</span>
        </button>

        <button
          onClick={() => {
            const nfcObj = recentObjects.find(o => o.type === 'NFC') || recentObjects[1];
            triggerSimulatedScan(nfcObj);
          }}
          className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl border border-surface-container shadow-sm hover:bg-surface-container-low transition-all active:scale-95 gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-[#a6e2ff]/30 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
            <Smartphone className="w-5 h-5 stroke-2" />
          </div>
          <span className="text-xs font-bold text-on-surface">Tap NFC Tag</span>
        </button>
      </div>

      {/* Recents list context */}
      <section className="max-w-sm mx-auto w-full space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-1.5">
            <History className="w-4 h-4 text-on-surface-variant/80" />
            <span>Recent Linked Objects</span>
          </h3>
          <span className="text-xxs text-primary font-bold">Simulator mode</span>
        </div>

        <div className="space-y-2.5">
          {recentObjects.map((obj) => (
            <div
              key={obj.id}
              onClick={() => triggerSimulatedScan(obj)}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-surface-container hover:border-primary-container/30 transition-all cursor-pointer active:scale-[0.99] group"
              title="Click to simulate scan"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container/60 flex items-center justify-center text-primary-container">
                  {obj.type === 'QR' ? (
                    <QrCode className="w-5 h-5 text-primary group-hover:rotate-6 transition-transform" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-on-surface leading-tight">{obj.name}</h4>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{obj.habitName}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-full text-xxs font-medium text-on-surface-variant/85">
                <Camera className="w-2.5 h-2.5 opacity-60" />
                <span>{obj.lastScannedText}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
