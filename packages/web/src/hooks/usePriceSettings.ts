import { useState } from 'react';

const HOURLY_WAGE_KEY = 'jc_hourly_wage';
const PROFIT_MARGIN_KEY = 'jc_profit_margin';

const DEFAULT_HOURLY_WAGE = 10;
const DEFAULT_PROFIT_MARGIN = 15;

const readFloat = (key: string, fallback: number): number => {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = parseFloat(stored);
    return isNaN(parsed) ? fallback : parsed;
};

export const usePriceSettings = () => {
    const [hourlyWage, setHourlyWage] = useState(() => readFloat(HOURLY_WAGE_KEY, DEFAULT_HOURLY_WAGE));
    const [profitMargin, setProfitMargin] = useState(() => readFloat(PROFIT_MARGIN_KEY, DEFAULT_PROFIT_MARGIN));

    const updateHourlyWage = (value: number) => {
        setHourlyWage(value);
        localStorage.setItem(HOURLY_WAGE_KEY, value.toString());
    };

    const updateProfitMargin = (value: number) => {
        setProfitMargin(value);
        localStorage.setItem(PROFIT_MARGIN_KEY, value.toString());
    };

    return { hourlyWage, profitMargin, updateHourlyWage, updateProfitMargin };
};
