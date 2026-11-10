export const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Design',
  'Business',
  'Mathematics',
  'Languages',
];

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const LEVEL_STYLES = {
  beginner: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  intermediate: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  advanced: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};

export const CATEGORY_STYLES = {
  'Web Development': 'from-indigo-500 to-violet-500',
  'Data Science': 'from-sky-500 to-cyan-500',
  Design: 'from-rose-500 to-orange-400',
  Business: 'from-amber-500 to-yellow-400',
  Mathematics: 'from-emerald-500 to-teal-500',
  Languages: 'from-fuchsia-500 to-pink-500',
};

export const STATUS_STYLES = {
  active: { label: 'In progress', className: 'bg-brand-50 text-brand-700 ring-brand-600/15' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
  dropped: { label: 'Dropped', className: 'bg-ink-100 text-ink-600 ring-ink-500/15' },
};

export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];
