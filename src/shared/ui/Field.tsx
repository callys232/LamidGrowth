import type { CSSProperties, ReactNode } from 'react';
import { Children, cloneElement, isValidElement, useId } from 'react';
export function Field({
  label,
  children,
  hint,
  style,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const attach = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (
        !isValidElement<{ children?: ReactNode; id?: string; 'aria-describedby'?: string }>(child)
      )
        return child;
      if (['input', 'textarea', 'select'].includes(String(child.type)))
        return cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : undefined });
      return child.props.children ? cloneElement(child, {}, attach(child.props.children)) : child;
    });
  return (
    <div className="field" style={style}>
      <label htmlFor={id}>{label}</label>
      {attach(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
