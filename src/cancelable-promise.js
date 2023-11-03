class CancelablePromise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new Error("Executor must be a function");
    }

    this._canceled = false;
    this._promise = new Promise(async (resolve, reject) => {
      try {
        if (this._canceled) {
          reject({ isCanceled: true });
          return;
        }

        await executor(
          (value) => {
            if (!this._canceled) {
              resolve(value);
            }
          },
          (reason) => {
            if (!this._canceled) {
              reject(reason);
            } else {
              reject({ isCanceled: true });
            }
          }
        );
      } catch (error) {
        if (!this._canceled) {
          reject(error);
        } else {
          reject({ isCanceled: true });
        }
      }
    }).catch((error) => {
      if (!this._canceled) {
        console.log("Unhandled promise rejection:", error);
      }
    });
  }

  static resolve(value) {
    return new CancelablePromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new CancelablePromise((_, reject) => reject(reason));
  }

  then(onFulfilled, onRejected) {
    return new CancelablePromise(async (resolve, reject) => {
      try {
        const result = await this._promise;

        if (this._canceled) {
          reject({ isCanceled: true });
        } else {
          const callback = this._canceled ? onRejected : onFulfilled;
          resolve(callback(result));
        }
      } catch (error) {
        if (this._canceled) {
          reject({ isCanceled: true });
        } else {
          reject(error);
        }
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  cancel() {
    this._canceled = true;
    if (typeof this._promise.cancel === "function") {
      this._promise.cancel();
    } else {
      this._promise = new CancelablePromise((resolve, reject) =>
        reject({ isCanceled: true })
      );
    }
  }

  get isCanceled() {
    return this._canceled;
  }

  set isCanceled(value) {
    this._canceled = value;
  }
}

module.exports = CancelablePromise;
