// v3
// Develop a class CancelablePromise that behaves similarly to the native Promise class in JavaScript
// but can cancel the entire promise chain from execution.

const CancelablePromise = require(`../src/cancelable-promise`);

const { describe, expect, test } = global;

describe("CancelablePromise test", () => {
  test("throws on wrong constructor arguments", () => {
    expect(() => new CancelablePromise()).toThrowError();
    expect(() => new CancelablePromise("wrong")).toThrowError();
  });

  test("create cancelable promise", () => {
    let isCompleted = false;
    const promise = new CancelablePromise(() => (isCompleted = true));
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(isCompleted).toBe(true);
  });

  test("resolving", async () => {
    const unique = Symbol();
    const promise = new CancelablePromise((resolve) =>
      setTimeout(() => resolve(unique))
    );
    await expect(promise).resolves.toBe(unique);
  });

  test("rejecting", async () => {
    const unique = Symbol();
    const promise = new CancelablePromise((resolve, reject) =>
      setTimeout(() => reject(unique))
    );
    await expect(promise).rejects.toBe(unique);
  });

  describe("#then()", () => {
    test("throws on wrong argument", () => {
      const promise = new CancelablePromise(() => void 0);
      expect(() => promise.then("wrong"));
    });

    test("then(onFulfilled)", async () => {
      const initValue = 10;
      const multiplier = 2;
      const onFulfilled = (value) => value * multiplier;

      const cp = new CancelablePromise((resolve) => resolve(initValue));
      const cp2 = cp.then((v) => {
        return new Promise((resolve) =>
          setTimeout(() => resolve(onFulfilled(v)))
        );
      });

      expect(cp).not.toBe(cp2);
      expect(cp2).toBeInstanceOf(CancelablePromise);
      await getPromiseState(cp2, (state) => expect(state).toBe("pending"));
      await expect(cp).resolves.toBe(initValue);
      await expect(cp2).resolves.toBe(onFulfilled(initValue));
    });

    test("then(onFulfilled, onRejected)", async () => {
      const initValue = 10;
      const multiplier = 2;
      const func = (value) => value * multiplier;

      const cp = new CancelablePromise((resolve, reject) => reject(initValue));
      const cp2 = cp.then((value) => value, func);

      expect(cp).not.toBe(cp2);
      expect(cp2).toBeInstanceOf(CancelablePromise);
      await cp2.catch(() => 0);
      await expect(cp).rejects.toEqual(initValue);
      await expect(cp2).resolves.toEqual(func(initValue));
    });

    test("then() - empty arguments", async () => {
      const initValue = 10;
      const cp = new CancelablePromise((resolve) => resolve(initValue)).then();

      expect(cp).toBeInstanceOf(CancelablePromise);
      await expect(cp).resolves.toBe(initValue);
    });

    test(".then().then() ... .then()", async () => {
      const depth = 10;
      let promise = new CancelablePromise((resolve) => resolve(0));
      for (let idx = 0; idx < depth; ++idx) {
        promise = promise.then((val) => val + 1);
      }

      expect(promise).toBeInstanceOf(CancelablePromise);
      await expect(promise).resolves.toBe(depth);
    });
  });

  describe("#cancel()", () => {
    test("should cancel promise", async () => {
      let value = 0;
      const p1 = new CancelablePromise((resolve) =>
        setTimeout(() => resolve(1), 100)
      );
      const p2 = p1.then((v) => (value = v));
      const p3 = p1.then(() => void 0);

      await getPromiseState(p3, (state) => expect(state).toBe("pending"));
      expect(typeof p2.cancel).toBe("function");

      try {
        setTimeout(() => p2.cancel());
        await expect(p1).rejects.toEqual({ isCanceled: true });
        await expect(p2).rejects.toEqual({ isCanceled: true });
        await expect(p3).rejects.toEqual({ isCanceled: true });
        expect(value).toBe(0);
      } catch (error) {
        console.log("Test failed with error:", error);
      }
    });
  });

  describe("#isCanceled", () => {
    test("should change state on cancel()", () => {
      const p1 = new CancelablePromise((resolve) => resolve(1));
      const p2 = p1.then(() => 2);
      const p3 = p1.then(() => 3);

      expect(p1.isCanceled).toBeFalsy();
      expect(p2.isCanceled).toBeFalsy();
      expect(p3.isCanceled).toBeFalsy();

      p2.cancel();

      expect(p2.isCanceled).toBeTruthy();

      // Because p1 is not affected by canceling p2, it should remain uncanceled.
      expect(p1.isCanceled).toBeFalsy();

      // Since p3 is derived from p1, it should also remain uncanceled.
      expect(p3.isCanceled).toBeFalsy();
    });
  });
});

function getPromiseState(promise, callback) {
  const unique = Symbol("unique");
  return Promise.race([promise, Promise.resolve(unique)])
    .then((value) => (value === unique ? "pending" : "fulfilled"))
    .catch(() => "rejected")
    .then((state) => {
      callback && callback(state);
      return state;
    });
}
