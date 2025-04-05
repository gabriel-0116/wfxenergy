// Regex usado para validar o formato com máscara: 00.000.000/0000-00
export const regexCNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

// Validação completa de CNPJ
export const validCNPJ = (value: string | number | number[] = ''): boolean => {
  if (!value) return false;

  const isString = typeof value === 'string';
  if (isString && !regexCNPJ.test(value)) return false;

  const numbers = matchNumbers(value);
  if (numbers.length !== 14) return false;

  const items = [...new Set(numbers)];
  if (items.length === 1) return false;

  const digit0 = validCalc(12, numbers);
  const digit1 = validCalc(13, numbers);

  return digit0 === numbers[12] && digit1 === numbers[13];
};

// Validação completa de CPF
export const validCPF = (value: string = ''): boolean => {
  const cleaned = value.replace(/[^\d]+/g, '');
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;

  const digits = cleaned.split('').map(Number);

  const calc = (slice: number) => {
    const sum = digits
      .slice(0, slice)
      .reduce((acc, digit, index) => acc + digit * (slice + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calc(9) === digits[9] && calc(10) === digits[10];
};

// Utilitário para extrair apenas números
function matchNumbers(value: string | number | number[] = '') {
  const match = value.toString().replace(/[^\d]+/g, '').match(/\d/g);
  return Array.isArray(match) ? match.map(Number) : [];
}

// Cálculo dos dígitos verificadores do CNPJ
function validCalc(x: number, numbers: number[]) {
  let factor = x - 7;
  let sum = 0;

  for (let i = 0; i < x; i++) {
    sum += numbers[i] * factor--;
    if (factor < 2) factor = 9;
  }

  const result = 11 - (sum % 11);
  return result > 9 ? 0 : result;
}

