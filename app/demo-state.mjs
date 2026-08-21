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
  const seen = new Set();
  return posts.filter(
    (post) => post.id !== root.id && (post.replyToId === root.id || (!post.replyToId && post.replyTo === root.name)),
  ).filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export function countNewRepliesForThread(posts, root, initialReplyIds = []) {
  const initialReplies = new Set(initialReplyIds);
  return repliesForThread(posts, root).filter((post) => !initialReplies.has(post.id)).length;
}

export function runExclusive(event, action) {
  event.stopPropagation();
  action();
}
