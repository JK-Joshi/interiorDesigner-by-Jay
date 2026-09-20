import s from './Grain.module.css';

/** Fixed animated film grain. Pure CSS, pointer-events: none. */
export default function Grain() {
  return <div className={s.grain} aria-hidden="true" />;
}
