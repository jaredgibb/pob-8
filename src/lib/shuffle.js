export function shuffle_array(items) {
  const array_copy = [...items];
  for (let i = array_copy.length - 1; i > 0; i -= 1) {
    const next_index = Math.floor(Math.random() * (i + 1));
    [array_copy[i], array_copy[next_index]] = [array_copy[next_index], array_copy[i]];
  }
  return array_copy;
}
