'use client';

import { useState } from 'react';
import { SiFacebook, SiX, SiWhatsapp } from 'react-icons/si';
import { Link2, Check, Share2 } from 'lucide-react';

interface ShareButtonProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  className?: string;
}

export function ShareButton({ eventId, eventName, eventDate, className }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/events/${eventId}`;
    }
    return '';
  };

  const shareText = `Check out ${eventName} on ${eventDate} — RTNY!`;

  const handleNativeShare = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.share({
        title: eventName,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or not supported — ignore
    }
    setShowMenu(false);
  };

  const handleShare = (platform: string) => {
    const shareUrl = getShareUrl();
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
    setShowMenu(false);
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={`relative ${className || ''}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-card border border-border rounded-full px-3 sm:px-6 py-3 hover:bg-accent/10 transition-colors flex items-center gap-2 shrink-0"
        aria-label="Share event"
      >
        <Share2 className="w-5 h-5" color="#59FFA0" />
        <span className="font-medium text-sm hidden sm:inline">Share</span>
      </button>

      {/* Backdrop */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl min-w-[220px] overflow-hidden">
          {supportsNativeShare && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 w-full px-5 py-3 hover:bg-accent/10 transition-colors text-left"
            >
              <Share2 size={20} color="#59FFA0" />
              <span className="text-sm font-medium">Share via...</span>
            </button>
          )}
          <button
            onClick={() => handleShare('facebook')}
            className="flex items-center gap-3 w-full px-5 py-3 hover:bg-accent/10 transition-colors text-left"
          >
            <SiFacebook size={20} color="#59FFA0" />
            <span className="text-sm font-medium">Facebook</span>
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="flex items-center gap-3 w-full px-5 py-3 hover:bg-accent/10 transition-colors text-left"
          >
            <SiX size={20} color="#59FFA0" />
            <span className="text-sm font-medium">Twitter</span>
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-3 w-full px-5 py-3 hover:bg-accent/10 transition-colors text-left"
          >
            <SiWhatsapp size={20} color="#59FFA0" />
            <span className="text-sm font-medium">WhatsApp</span>
          </button>
          <div className="border-t border-border" />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full px-5 py-3 hover:bg-accent/10 transition-colors text-left"
          >
            {copied ? <Check size={20} color="#59FFA0" /> : <Link2 size={20} color="#59FFA0" />}
            <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
