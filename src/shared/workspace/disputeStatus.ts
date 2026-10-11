/** A dispute is open until the server settles it; settled disputes carry `resolved_<outcome>`. */
export const isOpenDispute = (status: string | undefined | null) => status === 'open';
