import { ThemeProvider as NextThemesProvider } from 'next-themes';

type Props = React.ComponentProps<typeof NextThemesProvider>;

function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProvider storageKey="dive-shop:theme" {...props}>
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
