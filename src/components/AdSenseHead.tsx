import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const AdSenseHead: React.FC = () => {
  const [publisherId, setPublisherId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'adsense'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.enabled) {
          setPublisherId(data.publisherId || '');
          setVerificationCode(data.verificationCode || '');
        } else {
          setPublisherId('');
          setVerificationCode('');
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Remove any previously injected AdSense elements
    document.querySelectorAll('[data-adsense-head]').forEach(el => el.remove());

    // Inject verification code if provided (raw script tag from user)
    if (verificationCode) {
      const container = document.createElement('div');
      container.setAttribute('data-adsense-head', 'verification');
      container.style.display = 'none';
      document.head.appendChild(container);

      // Parse and inject script tags from the verification code
      const temp = document.createElement('div');
      temp.innerHTML = verificationCode;
      const scripts = temp.querySelectorAll('script');
      scripts.forEach((origScript) => {
        const script = document.createElement('script');
        // Copy all attributes
        Array.from(origScript.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        if (origScript.textContent) {
          script.textContent = origScript.textContent;
        }
        script.setAttribute('data-adsense-head', 'verification');
        document.head.appendChild(script);
      });
    }

    // Fallback: if no verification code but publisherId exists, inject the standard script
    if (!verificationCode && publisherId) {
      const existing = document.querySelector(`script[src*="adsbygoogle.js?client=${publisherId}"]`);
      if (!existing) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
        script.crossOrigin = 'anonymous';
        script.setAttribute('data-adsense-head', 'auto');
        document.head.appendChild(script);
      }
    }

    return () => {
      document.querySelectorAll('[data-adsense-head]').forEach(el => el.remove());
    };
  }, [publisherId, verificationCode]);

  return null;
};

export default AdSenseHead;
