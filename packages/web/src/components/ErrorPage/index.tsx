import { buttonVariants } from '../ui/button';

interface Props {
    error: Error | null;
}

const ErrorPage = ({ error }: Props) => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground">
        <div className="max-w-md text-center">
            <h1 className="mb-3 font-display text-3xl font-semibold">Something went wrong</h1>
            <p className="mb-4 text-muted-foreground">
                The page hit an unexpected error and the team has been notified. Try reloading, or go back to the home
                page.
            </p>
            {error?.message ? <p className="mb-6 text-sm text-muted-foreground">{error.message}</p> : null}
            <a className={buttonVariants()} href="/">
                Back to home
            </a>
        </div>
    </div>
);

export default ErrorPage;
