import { z } from 'zod';

import { zodErrorMap } from './formErrors';

z.config({ customError: zodErrorMap });
