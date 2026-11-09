export function ExerciseMediaView({ media, name, small }: { media: { id: string; mime: string } | null; name: string; small?: boolean }) {
  if (!media) return null;
  const src = `/api/exercise-media/${media.id}`;
  const cls = small ? "mt-2 max-h-32 rounded-lg" : "mt-2 max-h-56 w-full rounded-lg object-contain bg-slate-100";
  return media.mime.startsWith("video/")
    ? <video src={src} controls preload="metadata" className={cls} aria-label={`ویدیوی ${name}`} />
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={src} alt={`تصویر حرکت ${name}`} loading="lazy" className={cls} />;
}
