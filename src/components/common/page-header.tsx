type Props = {
  title: string;
  description?: string;
};

function PageHeader({ title, description }: Props) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default PageHeader;
