import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound({ variant = 'missing' }) {
  const forbidden = variant === 'forbidden';

  return (
    <div className="container-page grid min-h-[62vh] place-items-center py-16">
      <div className="max-w-md text-center">
        <p className="text-[64px] font-extrabold leading-none tracking-tight text-brand-200">
          {forbidden ? '403' : '404'}
        </p>
        <h1 className="mt-3 text-[24px] font-extrabold tracking-tight text-ink-900">
          {forbidden ? 'You do not have access to that page' : 'This page does not exist'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {forbidden
            ? 'Your account role cannot open this area. Sign in with an instructor or admin account to continue.'
            : 'The link may be broken, or the page may have been moved. Head back to the catalogue and pick up from there.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/">
            <Button>Back to catalogue</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Switch account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
