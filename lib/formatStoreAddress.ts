interface StoreAddressParts {
  address?: string | null;
  full_address?: string | null;
  street_address?: string | null;
  ward_name?: string | null;
  district?: string | null;
}

function cleanParts(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !['null', 'undefined'].includes(part.toLocaleLowerCase()));
}

export function formatStoreAddress(store: StoreAddressParts): string {
  const fullAddress = cleanParts(store.full_address);
  if (fullAddress.length) return fullAddress.join(', ');

  const street = cleanParts(store.street_address);
  if (street.length) {
    return [
      ...street,
      ...cleanParts(store.ward_name?.trim() || store.district),
      'Tỉnh Sơn La',
    ].join(', ');
  }

  const address = cleanParts(store.address);
  const district = cleanParts(store.district).filter(
    (part) => !address.some((addressPart) => addressPart.toLocaleLowerCase() === part.toLocaleLowerCase()),
  );
  return [...address, ...district].join(', ');
}
