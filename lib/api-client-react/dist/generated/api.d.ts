import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AuthUserEnvelope, BeginGoogleLoginParams, CertificationRequest, CertificationRequestInput, Conversation, ConversationInput, DeleteSuccess, ErrorEnvelope, FavoriteStatus, Garage, GarageInput, GaragePhoto, GaragePhotoInput, GarageSummary, GarageUpdate, HandleGoogleLoginCallbackParams, HealthStatus, ListCertifiedGaragesParams, ListGaragesParams, ListNotificationsParams, ListTopRatedGaragesParams, LogoutSuccess, MarkAllNotificationsReadParams, Message, MessageInput, Notification, PlatformStats, Profile, ProfileUpdate, Review, ReviewInput, UploadUrlRequest, UploadUrlResponse } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCurrentAuthUserUrl: () => string;
/**
 * @summary Get the currently authenticated user
 */
export declare const getCurrentAuthUser: (options?: RequestInit) => Promise<AuthUserEnvelope>;
export declare const getGetCurrentAuthUserQueryKey: () => readonly ["/api/auth/user"];
export declare const getGetCurrentAuthUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentAuthUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentAuthUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentAuthUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCurrentAuthUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentAuthUser>>>;
export type GetCurrentAuthUserQueryError = ErrorType<unknown>;
/**
 * @summary Get the currently authenticated user
 */
export declare function useGetCurrentAuthUser<TData = Awaited<ReturnType<typeof getCurrentAuthUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentAuthUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getBeginGoogleLoginUrl: (params: BeginGoogleLoginParams) => string;
/**
 * @summary Start the Google OAuth login flow for mobile
 */
export declare const beginGoogleLogin: (params: BeginGoogleLoginParams, options?: RequestInit) => Promise<unknown>;
export declare const getBeginGoogleLoginQueryKey: (params?: BeginGoogleLoginParams) => readonly ["/api/auth/google", ...BeginGoogleLoginParams[]];
export declare const getBeginGoogleLoginQueryOptions: <TData = Awaited<ReturnType<typeof beginGoogleLogin>>, TError = ErrorType<void>>(params: BeginGoogleLoginParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof beginGoogleLogin>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof beginGoogleLogin>>, TError, TData> & {
    queryKey: QueryKey;
};
export type BeginGoogleLoginQueryResult = NonNullable<Awaited<ReturnType<typeof beginGoogleLogin>>>;
export type BeginGoogleLoginQueryError = ErrorType<void>;
/**
 * @summary Start the Google OAuth login flow for mobile
 */
export declare function useBeginGoogleLogin<TData = Awaited<ReturnType<typeof beginGoogleLogin>>, TError = ErrorType<void>>(params: BeginGoogleLoginParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof beginGoogleLogin>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getHandleGoogleLoginCallbackUrl: (params?: HandleGoogleLoginCallbackParams) => string;
/**
 * @summary Complete the Google OAuth login flow
 */
export declare const handleGoogleLoginCallback: (params?: HandleGoogleLoginCallbackParams, options?: RequestInit) => Promise<unknown>;
export declare const getHandleGoogleLoginCallbackQueryKey: (params?: HandleGoogleLoginCallbackParams) => readonly ["/api/auth/google/callback", ...HandleGoogleLoginCallbackParams[]];
export declare const getHandleGoogleLoginCallbackQueryOptions: <TData = Awaited<ReturnType<typeof handleGoogleLoginCallback>>, TError = ErrorType<void>>(params?: HandleGoogleLoginCallbackParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof handleGoogleLoginCallback>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof handleGoogleLoginCallback>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HandleGoogleLoginCallbackQueryResult = NonNullable<Awaited<ReturnType<typeof handleGoogleLoginCallback>>>;
export type HandleGoogleLoginCallbackQueryError = ErrorType<void>;
/**
 * @summary Complete the Google OAuth login flow
 */
export declare function useHandleGoogleLoginCallback<TData = Awaited<ReturnType<typeof handleGoogleLoginCallback>>, TError = ErrorType<void>>(params?: HandleGoogleLoginCallbackParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof handleGoogleLoginCallback>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLogoutMobileSessionUrl: () => string;
/**
 * @summary Delete a mobile session token
 */
export declare const logoutMobileSession: (options?: RequestInit) => Promise<LogoutSuccess>;
export declare const getLogoutMobileSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutMobileSession>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logoutMobileSession>>, TError, void, TContext>;
export type LogoutMobileSessionMutationResult = NonNullable<Awaited<ReturnType<typeof logoutMobileSession>>>;
export type LogoutMobileSessionMutationError = ErrorType<unknown>;
/**
* @summary Delete a mobile session token
*/
export declare const useLogoutMobileSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logoutMobileSession>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logoutMobileSession>>, TError, void, TContext>;
export declare const getRequestUploadUrlUrl: () => string;
/**
 * @summary Request a presigned URL for file upload
 */
export declare const requestUploadUrl: (uploadUrlRequest: UploadUrlRequest, options?: RequestInit) => Promise<UploadUrlResponse>;
export declare const getRequestUploadUrlMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export type RequestUploadUrlMutationResult = NonNullable<Awaited<ReturnType<typeof requestUploadUrl>>>;
export type RequestUploadUrlMutationBody = BodyType<UploadUrlRequest>;
export type RequestUploadUrlMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Request a presigned URL for file upload
*/
export declare const useRequestUploadUrl: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export declare const getGetPublicObjectUrl: (filePath: string) => string;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare const getPublicObject: (filePath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetPublicObjectQueryKey: (filePath: string) => readonly [`/api/storage/public-objects/${string}`];
export declare const getGetPublicObjectQueryOptions: <TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPublicObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getPublicObject>>>;
export type GetPublicObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare function useGetPublicObject<TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetStorageObjectUrl: (objectPath: string) => string;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare const getStorageObject: (objectPath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetStorageObjectQueryKey: (objectPath: string) => readonly [`/api/storage/objects/${string}`];
export declare const getGetStorageObjectQueryOptions: <TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStorageObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getStorageObject>>>;
export type GetStorageObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare function useGetStorageObject<TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMyProfileUrl: () => string;
/**
 * @summary Get the current user's app profile
 */
export declare const getMyProfile: (options?: RequestInit) => Promise<Profile>;
export declare const getGetMyProfileQueryKey: () => readonly ["/api/profile"];
export declare const getGetMyProfileQueryOptions: <TData = Awaited<ReturnType<typeof getMyProfile>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;
export type GetMyProfileQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Get the current user's app profile
 */
export declare function useGetMyProfile<TData = Awaited<ReturnType<typeof getMyProfile>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateMyProfileUrl: () => string;
/**
 * @summary Update the current user's app profile
 */
export declare const updateMyProfile: (profileUpdate: ProfileUpdate, options?: RequestInit) => Promise<Profile>;
export declare const getUpdateMyProfileMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMyProfile>>, TError, {
        data: BodyType<ProfileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMyProfile>>, TError, {
    data: BodyType<ProfileUpdate>;
}, TContext>;
export type UpdateMyProfileMutationResult = NonNullable<Awaited<ReturnType<typeof updateMyProfile>>>;
export type UpdateMyProfileMutationBody = BodyType<ProfileUpdate>;
export type UpdateMyProfileMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Update the current user's app profile
*/
export declare const useUpdateMyProfile: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMyProfile>>, TError, {
        data: BodyType<ProfileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMyProfile>>, TError, {
    data: BodyType<ProfileUpdate>;
}, TContext>;
export declare const getGetPlatformStatsUrl: () => string;
/**
 * @summary Get dynamic platform-wide statistics
 */
export declare const getPlatformStats: (options?: RequestInit) => Promise<PlatformStats>;
export declare const getGetPlatformStatsQueryKey: () => readonly ["/api/stats"];
export declare const getGetPlatformStatsQueryOptions: <TData = Awaited<ReturnType<typeof getPlatformStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPlatformStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPlatformStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPlatformStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getPlatformStats>>>;
export type GetPlatformStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get dynamic platform-wide statistics
 */
export declare function useGetPlatformStats<TData = Awaited<ReturnType<typeof getPlatformStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPlatformStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListGaragesUrl: (params?: ListGaragesParams) => string;
/**
 * @summary Search and list garages
 */
export declare const listGarages: (params?: ListGaragesParams, options?: RequestInit) => Promise<GarageSummary[]>;
export declare const getListGaragesQueryKey: (params?: ListGaragesParams) => readonly ["/api/garages", ...ListGaragesParams[]];
export declare const getListGaragesQueryOptions: <TData = Awaited<ReturnType<typeof listGarages>>, TError = ErrorType<unknown>>(params?: ListGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGarages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGaragesQueryResult = NonNullable<Awaited<ReturnType<typeof listGarages>>>;
export type ListGaragesQueryError = ErrorType<unknown>;
/**
 * @summary Search and list garages
 */
export declare function useListGarages<TData = Awaited<ReturnType<typeof listGarages>>, TError = ErrorType<unknown>>(params?: ListGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateGarageUrl: () => string;
/**
 * @summary Create a garage profile for the current user (switches account to Garage Pro)
 */
export declare const createGarage: (garageInput: GarageInput, options?: RequestInit) => Promise<Garage>;
export declare const getCreateGarageMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGarage>>, TError, {
        data: BodyType<GarageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGarage>>, TError, {
    data: BodyType<GarageInput>;
}, TContext>;
export type CreateGarageMutationResult = NonNullable<Awaited<ReturnType<typeof createGarage>>>;
export type CreateGarageMutationBody = BodyType<GarageInput>;
export type CreateGarageMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Create a garage profile for the current user (switches account to Garage Pro)
*/
export declare const useCreateGarage: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGarage>>, TError, {
        data: BodyType<GarageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGarage>>, TError, {
    data: BodyType<GarageInput>;
}, TContext>;
export declare const getListTopRatedGaragesUrl: (params?: ListTopRatedGaragesParams) => string;
/**
 * @summary Top rated garages for the home screen carousel
 */
export declare const listTopRatedGarages: (params?: ListTopRatedGaragesParams, options?: RequestInit) => Promise<GarageSummary[]>;
export declare const getListTopRatedGaragesQueryKey: (params?: ListTopRatedGaragesParams) => readonly ["/api/garages/top-rated", ...ListTopRatedGaragesParams[]];
export declare const getListTopRatedGaragesQueryOptions: <TData = Awaited<ReturnType<typeof listTopRatedGarages>>, TError = ErrorType<unknown>>(params?: ListTopRatedGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTopRatedGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTopRatedGarages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTopRatedGaragesQueryResult = NonNullable<Awaited<ReturnType<typeof listTopRatedGarages>>>;
export type ListTopRatedGaragesQueryError = ErrorType<unknown>;
/**
 * @summary Top rated garages for the home screen carousel
 */
export declare function useListTopRatedGarages<TData = Awaited<ReturnType<typeof listTopRatedGarages>>, TError = ErrorType<unknown>>(params?: ListTopRatedGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTopRatedGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListCertifiedGaragesUrl: (params?: ListCertifiedGaragesParams) => string;
/**
 * @summary Certified garages for the home screen carousel
 */
export declare const listCertifiedGarages: (params?: ListCertifiedGaragesParams, options?: RequestInit) => Promise<GarageSummary[]>;
export declare const getListCertifiedGaragesQueryKey: (params?: ListCertifiedGaragesParams) => readonly ["/api/garages/certified", ...ListCertifiedGaragesParams[]];
export declare const getListCertifiedGaragesQueryOptions: <TData = Awaited<ReturnType<typeof listCertifiedGarages>>, TError = ErrorType<unknown>>(params?: ListCertifiedGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCertifiedGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCertifiedGarages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCertifiedGaragesQueryResult = NonNullable<Awaited<ReturnType<typeof listCertifiedGarages>>>;
export type ListCertifiedGaragesQueryError = ErrorType<unknown>;
/**
 * @summary Certified garages for the home screen carousel
 */
export declare function useListCertifiedGarages<TData = Awaited<ReturnType<typeof listCertifiedGarages>>, TError = ErrorType<unknown>>(params?: ListCertifiedGaragesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCertifiedGarages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMyGarageUrl: () => string;
/**
 * @summary Get the garage owned by the current user
 */
export declare const getMyGarage: (options?: RequestInit) => Promise<Garage | null>;
export declare const getGetMyGarageQueryKey: () => readonly ["/api/garages/mine"];
export declare const getGetMyGarageQueryOptions: <TData = Awaited<ReturnType<typeof getMyGarage>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyGarage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMyGarage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMyGarageQueryResult = NonNullable<Awaited<ReturnType<typeof getMyGarage>>>;
export type GetMyGarageQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Get the garage owned by the current user
 */
export declare function useGetMyGarage<TData = Awaited<ReturnType<typeof getMyGarage>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMyGarage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetGarageUrl: (garageId: number) => string;
/**
 * @summary Get a garage's public profile
 */
export declare const getGarage: (garageId: number, options?: RequestInit) => Promise<Garage>;
export declare const getGetGarageQueryKey: (garageId: number) => readonly [`/api/garages/${number}`];
export declare const getGetGarageQueryOptions: <TData = Awaited<ReturnType<typeof getGarage>>, TError = ErrorType<ErrorEnvelope>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGarage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGarage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGarageQueryResult = NonNullable<Awaited<ReturnType<typeof getGarage>>>;
export type GetGarageQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Get a garage's public profile
 */
export declare function useGetGarage<TData = Awaited<ReturnType<typeof getGarage>>, TError = ErrorType<ErrorEnvelope>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGarage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateGarageUrl: (garageId: number) => string;
/**
 * @summary Update a garage's profile (owner only)
 */
export declare const updateGarage: (garageId: number, garageUpdate: GarageUpdate, options?: RequestInit) => Promise<Garage>;
export declare const getUpdateGarageMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGarage>>, TError, {
        garageId: number;
        data: BodyType<GarageUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGarage>>, TError, {
    garageId: number;
    data: BodyType<GarageUpdate>;
}, TContext>;
export type UpdateGarageMutationResult = NonNullable<Awaited<ReturnType<typeof updateGarage>>>;
export type UpdateGarageMutationBody = BodyType<GarageUpdate>;
export type UpdateGarageMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Update a garage's profile (owner only)
*/
export declare const useUpdateGarage: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGarage>>, TError, {
        garageId: number;
        data: BodyType<GarageUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGarage>>, TError, {
    garageId: number;
    data: BodyType<GarageUpdate>;
}, TContext>;
export declare const getListGaragePhotosUrl: (garageId: number) => string;
/**
 * @summary List a garage's gallery photos
 */
export declare const listGaragePhotos: (garageId: number, options?: RequestInit) => Promise<GaragePhoto[]>;
export declare const getListGaragePhotosQueryKey: (garageId: number) => readonly [`/api/garages/${number}/photos`];
export declare const getListGaragePhotosQueryOptions: <TData = Awaited<ReturnType<typeof listGaragePhotos>>, TError = ErrorType<unknown>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGaragePhotos>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGaragePhotos>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGaragePhotosQueryResult = NonNullable<Awaited<ReturnType<typeof listGaragePhotos>>>;
export type ListGaragePhotosQueryError = ErrorType<unknown>;
/**
 * @summary List a garage's gallery photos
 */
export declare function useListGaragePhotos<TData = Awaited<ReturnType<typeof listGaragePhotos>>, TError = ErrorType<unknown>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGaragePhotos>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddGaragePhotoUrl: (garageId: number) => string;
/**
 * @summary Add a photo to a garage's gallery (owner only)
 */
export declare const addGaragePhoto: (garageId: number, garagePhotoInput: GaragePhotoInput, options?: RequestInit) => Promise<GaragePhoto>;
export declare const getAddGaragePhotoMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addGaragePhoto>>, TError, {
        garageId: number;
        data: BodyType<GaragePhotoInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addGaragePhoto>>, TError, {
    garageId: number;
    data: BodyType<GaragePhotoInput>;
}, TContext>;
export type AddGaragePhotoMutationResult = NonNullable<Awaited<ReturnType<typeof addGaragePhoto>>>;
export type AddGaragePhotoMutationBody = BodyType<GaragePhotoInput>;
export type AddGaragePhotoMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Add a photo to a garage's gallery (owner only)
*/
export declare const useAddGaragePhoto: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addGaragePhoto>>, TError, {
        garageId: number;
        data: BodyType<GaragePhotoInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addGaragePhoto>>, TError, {
    garageId: number;
    data: BodyType<GaragePhotoInput>;
}, TContext>;
export declare const getDeleteGaragePhotoUrl: (garageId: number, photoId: number) => string;
/**
 * @summary Remove a photo from a garage's gallery (owner only)
 */
export declare const deleteGaragePhoto: (garageId: number, photoId: number, options?: RequestInit) => Promise<DeleteSuccess>;
export declare const getDeleteGaragePhotoMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGaragePhoto>>, TError, {
        garageId: number;
        photoId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteGaragePhoto>>, TError, {
    garageId: number;
    photoId: number;
}, TContext>;
export type DeleteGaragePhotoMutationResult = NonNullable<Awaited<ReturnType<typeof deleteGaragePhoto>>>;
export type DeleteGaragePhotoMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Remove a photo from a garage's gallery (owner only)
*/
export declare const useDeleteGaragePhoto: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGaragePhoto>>, TError, {
        garageId: number;
        photoId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteGaragePhoto>>, TError, {
    garageId: number;
    photoId: number;
}, TContext>;
export declare const getListGarageReviewsUrl: (garageId: number) => string;
/**
 * @summary List reviews for a garage
 */
export declare const listGarageReviews: (garageId: number, options?: RequestInit) => Promise<Review[]>;
export declare const getListGarageReviewsQueryKey: (garageId: number) => readonly [`/api/garages/${number}/reviews`];
export declare const getListGarageReviewsQueryOptions: <TData = Awaited<ReturnType<typeof listGarageReviews>>, TError = ErrorType<unknown>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGarageReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGarageReviews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGarageReviewsQueryResult = NonNullable<Awaited<ReturnType<typeof listGarageReviews>>>;
export type ListGarageReviewsQueryError = ErrorType<unknown>;
/**
 * @summary List reviews for a garage
 */
export declare function useListGarageReviews<TData = Awaited<ReturnType<typeof listGarageReviews>>, TError = ErrorType<unknown>>(garageId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGarageReviews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateGarageReviewUrl: (garageId: number) => string;
/**
 * @summary Leave a review for a garage (authenticated clients only)
 */
export declare const createGarageReview: (garageId: number, reviewInput: ReviewInput, options?: RequestInit) => Promise<Review>;
export declare const getCreateGarageReviewMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGarageReview>>, TError, {
        garageId: number;
        data: BodyType<ReviewInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGarageReview>>, TError, {
    garageId: number;
    data: BodyType<ReviewInput>;
}, TContext>;
export type CreateGarageReviewMutationResult = NonNullable<Awaited<ReturnType<typeof createGarageReview>>>;
export type CreateGarageReviewMutationBody = BodyType<ReviewInput>;
export type CreateGarageReviewMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Leave a review for a garage (authenticated clients only)
*/
export declare const useCreateGarageReview: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGarageReview>>, TError, {
        garageId: number;
        data: BodyType<ReviewInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGarageReview>>, TError, {
    garageId: number;
    data: BodyType<ReviewInput>;
}, TContext>;
export declare const getListMyFavoritesUrl: () => string;
/**
 * @summary List the current user's favorite garages
 */
export declare const listMyFavorites: (options?: RequestInit) => Promise<GarageSummary[]>;
export declare const getListMyFavoritesQueryKey: () => readonly ["/api/favorites"];
export declare const getListMyFavoritesQueryOptions: <TData = Awaited<ReturnType<typeof listMyFavorites>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMyFavorites>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMyFavoritesQueryResult = NonNullable<Awaited<ReturnType<typeof listMyFavorites>>>;
export type ListMyFavoritesQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary List the current user's favorite garages
 */
export declare function useListMyFavorites<TData = Awaited<ReturnType<typeof listMyFavorites>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyFavorites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAddFavoriteUrl: (garageId: number) => string;
/**
 * @summary Add a garage to the current user's favorites
 */
export declare const addFavorite: (garageId: number, options?: RequestInit) => Promise<FavoriteStatus>;
export declare const getAddFavoriteMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
        garageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
    garageId: number;
}, TContext>;
export type AddFavoriteMutationResult = NonNullable<Awaited<ReturnType<typeof addFavorite>>>;
export type AddFavoriteMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Add a garage to the current user's favorites
*/
export declare const useAddFavorite: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFavorite>>, TError, {
        garageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addFavorite>>, TError, {
    garageId: number;
}, TContext>;
export declare const getRemoveFavoriteUrl: (garageId: number) => string;
/**
 * @summary Remove a garage from the current user's favorites
 */
export declare const removeFavorite: (garageId: number, options?: RequestInit) => Promise<FavoriteStatus>;
export declare const getRemoveFavoriteMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeFavorite>>, TError, {
        garageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeFavorite>>, TError, {
    garageId: number;
}, TContext>;
export type RemoveFavoriteMutationResult = NonNullable<Awaited<ReturnType<typeof removeFavorite>>>;
export type RemoveFavoriteMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Remove a garage from the current user's favorites
*/
export declare const useRemoveFavorite: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeFavorite>>, TError, {
        garageId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeFavorite>>, TError, {
    garageId: number;
}, TContext>;
export declare const getListConversationsUrl: () => string;
/**
 * @summary List the current user's conversations
 */
export declare const listConversations: (options?: RequestInit) => Promise<Conversation[]>;
export declare const getListConversationsQueryKey: () => readonly ["/api/conversations"];
export declare const getListConversationsQueryOptions: <TData = Awaited<ReturnType<typeof listConversations>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof listConversations>>>;
export type ListConversationsQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary List the current user's conversations
 */
export declare function useListConversations<TData = Awaited<ReturnType<typeof listConversations>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getStartConversationUrl: () => string;
/**
 * @summary Start (or reuse) a conversation with a garage
 */
export declare const startConversation: (conversationInput: ConversationInput, options?: RequestInit) => Promise<Conversation>;
export declare const getStartConversationMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startConversation>>, TError, {
        data: BodyType<ConversationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startConversation>>, TError, {
    data: BodyType<ConversationInput>;
}, TContext>;
export type StartConversationMutationResult = NonNullable<Awaited<ReturnType<typeof startConversation>>>;
export type StartConversationMutationBody = BodyType<ConversationInput>;
export type StartConversationMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Start (or reuse) a conversation with a garage
*/
export declare const useStartConversation: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startConversation>>, TError, {
        data: BodyType<ConversationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startConversation>>, TError, {
    data: BodyType<ConversationInput>;
}, TContext>;
export declare const getListMessagesUrl: (conversationId: number) => string;
/**
 * @summary List messages in a conversation
 */
export declare const listMessages: (conversationId: number, options?: RequestInit) => Promise<Message[]>;
export declare const getListMessagesQueryKey: (conversationId: number) => readonly [`/api/conversations/${number}/messages`];
export declare const getListMessagesQueryOptions: <TData = Awaited<ReturnType<typeof listMessages>>, TError = ErrorType<ErrorEnvelope>>(conversationId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof listMessages>>>;
export type ListMessagesQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary List messages in a conversation
 */
export declare function useListMessages<TData = Awaited<ReturnType<typeof listMessages>>, TError = ErrorType<ErrorEnvelope>>(conversationId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSendMessageUrl: (conversationId: number) => string;
/**
 * @summary Send a message in a conversation
 */
export declare const sendMessage: (conversationId: number, messageInput: MessageInput, options?: RequestInit) => Promise<Message>;
export declare const getSendMessageMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        conversationId: number;
        data: BodyType<MessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    conversationId: number;
    data: BodyType<MessageInput>;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<MessageInput>;
export type SendMessageMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Send a message in a conversation
*/
export declare const useSendMessage: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        conversationId: number;
        data: BodyType<MessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    conversationId: number;
    data: BodyType<MessageInput>;
}, TContext>;
export declare const getMarkConversationReadUrl: (conversationId: number) => string;
/**
 * @summary Mark all messages in a conversation as read
 */
export declare const markConversationRead: (conversationId: number, options?: RequestInit) => Promise<Conversation>;
export declare const getMarkConversationReadMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markConversationRead>>, TError, {
        conversationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markConversationRead>>, TError, {
    conversationId: number;
}, TContext>;
export type MarkConversationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markConversationRead>>>;
export type MarkConversationReadMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Mark all messages in a conversation as read
*/
export declare const useMarkConversationRead: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markConversationRead>>, TError, {
        conversationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markConversationRead>>, TError, {
    conversationId: number;
}, TContext>;
export declare const getListNotificationsUrl: (params?: ListNotificationsParams) => string;
/**
 * @summary List the current user's notifications
 */
export declare const listNotifications: (params?: ListNotificationsParams, options?: RequestInit) => Promise<Notification[]>;
export declare const getListNotificationsQueryKey: (params?: ListNotificationsParams) => readonly ["/api/notifications", ...ListNotificationsParams[]];
export declare const getListNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<ErrorEnvelope>>(params?: ListNotificationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof listNotifications>>>;
export type ListNotificationsQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary List the current user's notifications
 */
export declare function useListNotifications<TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<ErrorEnvelope>>(params?: ListNotificationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getMarkNotificationReadUrl: (notificationId: number) => string;
/**
 * @summary Mark a single notification as read
 */
export declare const markNotificationRead: (notificationId: number, options?: RequestInit) => Promise<Notification>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        notificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    notificationId: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Mark a single notification as read
*/
export declare const useMarkNotificationRead: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        notificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    notificationId: number;
}, TContext>;
export declare const getMarkAllNotificationsReadUrl: (params?: MarkAllNotificationsReadParams) => string;
/**
 * @summary Mark all of the current user's notifications as read
 */
export declare const markAllNotificationsRead: (params?: MarkAllNotificationsReadParams, options?: RequestInit) => Promise<DeleteSuccess>;
export declare const getMarkAllNotificationsReadMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, {
        params?: MarkAllNotificationsReadParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, {
    params?: MarkAllNotificationsReadParams;
}, TContext>;
export type MarkAllNotificationsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markAllNotificationsRead>>>;
export type MarkAllNotificationsReadMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Mark all of the current user's notifications as read
*/
export declare const useMarkAllNotificationsRead: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, {
        params?: MarkAllNotificationsReadParams;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, {
    params?: MarkAllNotificationsReadParams;
}, TContext>;
export declare const getCreateCertificationRequestUrl: () => string;
/**
 * @summary Submit a professional certification request
 */
export declare const createCertificationRequest: (certificationRequestInput: CertificationRequestInput, options?: RequestInit) => Promise<CertificationRequest>;
export declare const getCreateCertificationRequestMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCertificationRequest>>, TError, {
        data: BodyType<CertificationRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCertificationRequest>>, TError, {
    data: BodyType<CertificationRequestInput>;
}, TContext>;
export type CreateCertificationRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createCertificationRequest>>>;
export type CreateCertificationRequestMutationBody = BodyType<CertificationRequestInput>;
export type CreateCertificationRequestMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Submit a professional certification request
*/
export declare const useCreateCertificationRequest: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCertificationRequest>>, TError, {
        data: BodyType<CertificationRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCertificationRequest>>, TError, {
    data: BodyType<CertificationRequestInput>;
}, TContext>;
export declare const getListMyCertificationRequestsUrl: () => string;
/**
 * @summary List the current user's certification requests
 */
export declare const listMyCertificationRequests: (options?: RequestInit) => Promise<CertificationRequest[]>;
export declare const getListMyCertificationRequestsQueryKey: () => readonly ["/api/certification-requests/mine"];
export declare const getListMyCertificationRequestsQueryOptions: <TData = Awaited<ReturnType<typeof listMyCertificationRequests>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyCertificationRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMyCertificationRequests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMyCertificationRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof listMyCertificationRequests>>>;
export type ListMyCertificationRequestsQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary List the current user's certification requests
 */
export declare function useListMyCertificationRequests<TData = Awaited<ReturnType<typeof listMyCertificationRequests>>, TError = ErrorType<ErrorEnvelope>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyCertificationRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map