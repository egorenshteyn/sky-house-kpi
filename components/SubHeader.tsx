type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function SubHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div className="page-header-inner">
        <div>
          <h1 className="text-2xl font-semibold text-[#161616]">{title}</h1>
          {subtitle && (
            <p className="page-subtitle">{subtitle}</p>
          )}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}
