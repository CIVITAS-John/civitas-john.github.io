
/** The parameters for the visualizer. */
export class Parameters {
    // For the semantic graph
    /** The minimum distance to create links between codes. */
    linkMinDist = 0.6;
    /** The maximum distance to create links between codes. */
    linkMaxDist = 0.9;
    /** The number of closest neighbors to guarantee links regardless of the threshold. */
    closestNeighbors = 3;
    /** Whether to visualize the near-owners in place of owners. */
    useNearOwners = true;
    /** Whether to consider the extended part of data chunks when filtering. */
    useExtendedChunk = false;
}
/** Linearly interpolate between two values. */
export const inverseLerp = (a, b, t, clamp = true) => {
    const result = (t - a) / (b - a);
    if (clamp) {
        return Math.min(1, Math.max(0, result));
    }
    return result;
};
/** Calculate the Jensen-Shannon Divergence between two distributions. */
export const calculateJSD = (P, Q) => {
    // Helper function to calculate the KL divergence
    const KLD = (P, Q) => P.reduce((sum, p, i) => {
        if (p === 0) {
            return sum;
        }
        if (Q[i] === 0) {
            throw new Error("KL Divergence is not defined when Q[i] is 0 and P[i] is non-zero");
        }
        return sum + p * Math.log(p / Q[i]);
    }, 0);
    // Normalize the distributions to make them probability distributions
    const sumP = P.reduce((a, b) => a + b, 0);
    const sumQ = Q.reduce((a, b) => a + b, 0);
    const normalizedP = P.map((p) => p / sumP);
    const normalizedQ = Q.map((q) => q / sumQ);
    // Calculate the average distribution
    const M = normalizedP.map((p, i) => (p + normalizedQ[i]) / 2);
    // Calculate the Jensen-Shannon Divergence
    const jsd = (KLD(normalizedP, M) + KLD(normalizedQ, M)) / 2;
    return jsd;
};
/** Get the color of a codebook. */
export const getCodebookColor = (num, codebooks) => {
    if (codebooks <= 10) {
        return d3.schemeTableau10[num];
    }
    return d3.interpolateSinebow(num / codebooks);
};
/** Format a date. */
export const formatDate = (date) => {
    if (!(date instanceof Date)) {
        return "(Unknown)";
    }
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
    });
};
/** Post data to a URL in the browser context. */
export const postData = (url, data) => fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
});
