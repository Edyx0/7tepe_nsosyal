// Local reducers deliberately replace the donor app's Firebase mutations.
export function toggleItem(items, id) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

export function removeItem(items, id) {
  return items.includes(id) ? items : [...items, id];
}

export function togglePinned(current, id) {
  return current === id ? null : id;
}

export function repliesForThread(posts, root) {
  return posts.filter(
    (post) => post.id !== root.id && post.replyTo === root.name,
  );
}

export function runExclusive(event, action) {
  event.stopPropagation();
  action();
}
