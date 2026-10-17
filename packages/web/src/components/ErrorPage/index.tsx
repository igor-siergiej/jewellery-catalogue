interface Props {
    error: Error | null;
}

const ErrorPage = ({ error }: Props) => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-slate-900">
        <div className="max-w-md text-center">
            <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
            <p className="mb-4 text-slate-600">
                The page hit an unexpected error. The team has been notified — try reloading, or head back to the home
                page.
            </p>
            {error?.message ? <p className="mb-6 text-sm text-slate-500">{error.message}</p> : null}
            <a
                className="inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                href="/"
            >
                Back to home
            </a>
        </div>
    </div>
);

export default ErrorPage;
