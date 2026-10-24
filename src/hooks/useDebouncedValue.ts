/**
 * useDebouncedValue — yazım bitince (ms sonra) değeri döner; arama kutularında her tuşta istek atılmasın diye
 */

import { useEffect, useState } from 'react';

export default function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
