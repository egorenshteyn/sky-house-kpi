type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function SubHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#161616]">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
