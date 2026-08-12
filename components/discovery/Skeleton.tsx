interface SkeletonProps {
  w: number | string;
  h: number | string;
}

export function Skeleton({ w, h }: SkeletonProps) {
  return <div className="skel" style={{ width: w, height: h }} />;
}
