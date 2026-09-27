package com.huigu.phone10.compat;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import kotlin.ResultKt;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.coroutines.intrinsics.IntrinsicsKt;

/** Read-only adapter for O's existing getChatMessages. Called on the JS worker, never the UI thread. */
public final class NativeHistoryRead {
  private NativeHistoryRead() { }

  public static Object read(Object reader, Object tool, long timeoutMs) throws Exception {
    if (timeoutMs < 1 || timeoutMs > 5000) throw new IllegalArgumentException("invalid read deadline");
    CompletableFuture<Object> result = new CompletableFuture<>();
    Continuation<Object> continuation = new Continuation<Object>() {
      @Override public CoroutineContext getContext() { return EmptyCoroutineContext.INSTANCE; }
      @Override public void resumeWith(Object value) {
        try {
          ResultKt.throwOnFailure(value);
          result.complete(value);
        } catch (Throwable error) { result.completeExceptionally(error); }
      }
    };
    Method method = reader.getClass().getMethod("getChatMessages", tool.getClass(), Continuation.class);
    try {
      Object immediate = method.invoke(reader, tool, continuation);
      if (immediate != IntrinsicsKt.getCOROUTINE_SUSPENDED()) result.complete(immediate);
    } catch (InvocationTargetException error) { result.completeExceptionally(error.getCause()); }
    try { return result.get(timeoutMs, TimeUnit.MILLISECONDS); }
    catch (InterruptedException error) { Thread.currentThread().interrupt(); throw error; }
    catch (ExecutionException error) {
      Throwable cause = error.getCause();
      if (cause instanceof Exception) throw (Exception) cause;
      throw new IllegalStateException("native history read failed", cause);
    }
  }
}
