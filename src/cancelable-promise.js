class CancelablePromise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new Error("Executor must be a function");
    }

    this._canceled = false;
    this._promise = new Promise((resolve, reject) => {
      executor(
        value => {
          if (!this._canceled) {
            resolve(value);
          }
        },
        reason => {
          if (!this._canceled) {
            reject(reason);
          }
        }
      );
    });
  }

  static resolve(value) {
    return new CancelablePromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new CancelablePromise((_, reject) => reject(reason));
  }

  then(onFulfilled, onRejected) {
    const proxyFulfilled = value => (!this._canceled ? onFulfilled(value) : undefined);
    const proxyRejected = reason => (!this._canceled ? onRejected(reason) : undefined);

    const chainedPromise = this._promise.then(proxyFulfilled, proxyRejected);
    return new CancelablePromise((resolve, reject) => chainedPromise.then(resolve, reject));
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  cancel() {
    this._canceled = true;
  }

  get isCanceled() {
    return this._canceled;
  }
}

module.exports = CancelablePromise;