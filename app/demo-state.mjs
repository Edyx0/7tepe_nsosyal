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

export function threadedRepliesForRoot(posts, root) {
  const uniquePosts = Array.from(new Map(posts.map((post) => [post.id, post])).values());
  const childrenByParent = new Map();
  for (const post of uniquePosts) {
    if (post.id === root.id) continue;
    const parentId = post.replyToId ?? (post.replyTo === root.name ? root.id : null);
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(post);
    childrenByParent.set(parentId, children);
  }
  const visited = new Set();
  const makeBranch = (parentId) => (childrenByParent.get(parentId) ?? []).flatMap((post) => {
    if (visited.has(post.id)) return [];
    visited.add(post.id);
    return [{ post, children: makeBranch(post.id) }];
  });
  return makeBranch(root.id);
}

export function threadRootForPost(posts, post) {
  const byId = new Map(posts.map((candidate) => [candidate.id, candidate]));
  const seen = new Set([post.id]);
  let current = post;
  while (current.replyToId) {
    const parent = byId.get(current.replyToId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    current = parent;
  }
  return current;
}

export function countNewRepliesForThread(posts, root, initialReplyIds = []) {
  const initialReplies = new Set(initialReplyIds);
  return repliesForThread(posts, root).filter((post) => !initialReplies.has(post.id)).length;
}

export function runExclusive(event, action) {
  event.stopPropagation();
  action();
}
