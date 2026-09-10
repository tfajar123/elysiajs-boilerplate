interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const response = {
  success: <T>(data: T, message = 'Success'): ApiResponse<T> => {
    return {
      success: true,
      message,
      data,
    };
  },
  created: <T>(data: T, message = 'Created'): ApiResponse<T> => {
    return {
      success: true,
      message,
      data,
    };
  },
  error: <T>(data: T, message = 'Error'): ApiResponse<T> => {
    return {
      success: false,
      message,
      data,
    };
  },
};
