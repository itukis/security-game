// Verify and preview apply both mutate shared Docker state. Serialize requests
// to avoid cross-user races between container rebuilds/restarts.
let containerMutationQueue = Promise.resolve();

function enqueueContainerMutation(task) {
  const next = containerMutationQueue.then(
    () => task(),
    (prevErr) => {
      console.error('Previous container mutation task failed:', prevErr.message);
      return task();
    }
  );
  containerMutationQueue = next.catch(() => {});
  return next;
}

module.exports = { enqueueContainerMutation };
