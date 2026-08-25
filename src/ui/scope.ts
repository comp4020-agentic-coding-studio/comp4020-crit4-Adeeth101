// A waveform readout across the top. It is decoration, but it is honest
// decoration: it draws the signal actually leaving the master bus, so what
// you see is what the page is generating.

export function attachScope(canvas: HTMLCanvasElement, analyser: AnalyserNode): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => {};

  const data = new Uint8Array(analyser.fftSize);
  let frame = 0;

  const resize = (): void => {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const draw = (): void => {
    frame = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(data);

    const { width, height } = canvas.getBoundingClientRect();
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const line = styles.getPropertyValue("--scope-line").trim() || "#7cf6d2";

    context.lineWidth = 1.6;
    context.strokeStyle = line;
    context.shadowColor = line;
    context.shadowBlur = 10;
    context.beginPath();

    for (let i = 0; i < data.length; i += 1) {
      const x = (i / (data.length - 1)) * width;
      const y = height / 2 + ((data[i] - 128) / 128) * (height / 2) * 0.92;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  draw();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
