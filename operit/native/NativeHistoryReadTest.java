import kotlin.coroutines.*;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import java.lang.reflect.*;
import java.util.concurrent.*;

public final class NativeHistoryReadTest {
  public static final class Reader {
    final int mode;
    Reader(int mode) { this.mode = mode; }
    public Object getChatMessages(String tool, Continuation<Object> continuation) {
      if (mode == 0) return "selected-variant";
      if (mode == 1 || mode == 2) {
        Thread t = new Thread(() -> {
          try { Thread.sleep(15); } catch (InterruptedException e) { throw new RuntimeException(e); }
          continuation.resumeWith(mode == 1 ? "completed-reply" : kotlin.ResultKt.createFailure(new IllegalStateException("read-failed")));
        });
        t.setDaemon(true);
        t.start();
      }
      return IntrinsicsKt.getCOROUTINE_SUSPENDED();
    }
  }
  static Object read(int mode, long timeout) throws Exception {
    try {
      return Class.forName("com.huigu.phone10.compat.NativeHistoryRead")
        .getMethod("read", Object.class, Object.class, long.class)
        .invoke(null, new Reader(mode), "tool", timeout);
    } catch (ClassNotFoundException e) { throw new AssertionError("Missing native bounded history reader", e); }
    catch (InvocationTargetException e) {
      Throwable cause = e.getCause();
      if (cause instanceof Exception) throw (Exception) cause;
      throw e;
    }
  }
  public static void main(String[] args) throws Exception {
    if (!"selected-variant".equals(read(0, 1000))) throw new AssertionError("immediate result changed");
    if (!"completed-reply".equals(read(1, 1000))) throw new AssertionError("native completion lost");
    try { read(2, 1000); throw new AssertionError("native error swallowed"); }
    catch (IllegalStateException expected) { if (!"read-failed".equals(expected.getMessage())) throw expected; }
    long start = System.nanoTime();
    try { read(3, 70); throw new AssertionError("missing timeout"); }
    catch (TimeoutException expected) { }
    if (TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start) > 1000) throw new AssertionError("timeout not bounded");
    System.out.println("PASS: immediate, async completion without JS loop, native failure, native timeout");
  }
}
