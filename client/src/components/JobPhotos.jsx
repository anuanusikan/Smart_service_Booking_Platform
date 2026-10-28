import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function JobPhotos({ images, title }) {
  const [selected, setSelected] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);
  const dialogRef = useRef(null);
  const isOpen = selected !== null;

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!Array.isArray(images) || images.length === 0) return null;
  const move = direction => setSelected(current => (current + direction + images.length) % images.length);

  return (
    <div className="job-photos" role="group" aria-label="Customer uploaded job photos">
      <p className="job-photos-label">Job photos <span>Click to enlarge</span></p>
      <div className="job-photos-grid">
        {images.map((url, index) => (
          <button key={`${url}-${index}`} type="button" onClick={() => setSelected(index)}
            aria-label={`View photo ${index + 1} of ${title}`}>
            <img src={url} alt={`${title} - photo ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {createPortal(
        <dialog ref={dialogRef} className="job-photo-viewer" aria-label={`Photos of ${title}`}
          onClose={() => setSelected(null)}
          onClick={event => { if (event.target === event.currentTarget) dialogRef.current.close(); }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
          }}>
          <div className="job-photo-viewer-content">
            <header>
              <div><strong>{title}</strong><span aria-live="polite">Photo {(selected ?? 0) + 1} of {images.length}</span></div>
              <button type="button" autoFocus aria-label="Close photo viewer" onClick={() => dialogRef.current.close()}>&times;</button>
            </header>
            {isOpen && (failedUrl === images[selected] ? (
              <p role="alert">This photo could not be loaded.</p>
            ) : (
              <img key={images[selected]} className="job-photo-full" src={images[selected]}
                alt={`${title} - photo ${selected + 1}`} onError={() => setFailedUrl(images[selected])} />
            ))}
            {images.length > 1 && (
              <footer>
                <button type="button" onClick={() => move(-1)}>Previous</button>
                <button type="button" onClick={() => move(1)}>Next</button>
              </footer>
            )}
          </div>
        </dialog>, document.body
      )}
    </div>
  );
}
