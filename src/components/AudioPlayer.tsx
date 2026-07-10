import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../utils/format';

interface AudioPlayerProps {
  src: string;
  /** 音频文件名（与播放按钮同行展示）；不传则仅展示按钮（紧凑场景） */
  fileName?: string;
  /** 追加在时间后的附加信息（如文件大小），用 · 分隔 */
  meta?: string;
  /** 圆环按钮直径（默认 36），列表等紧凑场景可传小尺寸 */
  size?: number;
  className?: string;
}

/**
 * 音频播放器
 * 播放按钮即圆环进度指示器（顺时针填充），文件名与按钮同排展示，Apple 风格。
 */
export default function AudioPlayer({ src, fileName, meta, size = 36, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 默认音量 70%，避免突然的大音量
    audio.volume = 0.7;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const strokeWidth = 2;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;
  const iconSize = Math.round(size * 0.33);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* 圆环进度播放按钮 */}
      <button
        onClick={togglePlay}
        className="relative flex shrink-0 items-center justify-center outline-none"
        style={{ width: size, height: size }}
        aria-label={isPlaying ? '暂停' : '播放'}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute -rotate-90">
          {/* 背景轨道 */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
          {/* 进度圆环 */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1d1d1f"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="relative text-ink">
          {isPlaying ? (
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          ) : (
            <path d="M8 5v14l11-7z" />
          )}
        </svg>
      </button>

      {/* 文件名 + 元信息（左侧） */}
      {fileName && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink" title={fileName}>
            {fileName}
          </p>
          {meta && (
            <p className="mt-0.5 text-xs text-subtle">
              {meta}
            </p>
          )}
        </div>
      )}

      {/* 时间信息（右侧对齐，增强视觉平衡） */}
      {fileName && (
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-xs font-medium text-ink">
            {formatDuration(currentTime)}
          </p>
          <p className="mt-0.5 tabular-nums text-xs text-subtle">
            {formatDuration(duration)}
          </p>
        </div>
      )}
    </div>
  );
}
