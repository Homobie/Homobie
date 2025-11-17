import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "wouter";
import {
  Grid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import PropertyCard from "./PropertyCard";
import ListViewCard from "./ListViewCard";
import PropertyFilters from "./PropertyFilters";

const baseUrl = `${import.meta.env.VITE_BASE_URL}`;

// Helper function to convert byte array to image URL
// (This function remains unchanged)
const convertByteArrayToImageUrl = (byteArray) => {
  if (!byteArray || byteArray.length === 0) {
    console.warn("Empty or null byte array provided");
    return "/placeholder.jpg";
  }

  try {
    // Handle different input formats
    let uint8Array;

    if (byteArray instanceof Uint8Array) {
      uint8Array = byteArray;
    } else if (Array.isArray(byteArray)) {
      uint8Array = new Uint8Array(byteArray);
    } else if (typeof byteArray === "string") {
      // Handle base64 strings
      try {
        const base64Data = byteArray.includes(",")
          ? byteArray.split(",")[1]
          : byteArray;
        const binaryString = atob(base64Data);
        uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } catch (e) {
        console.error("Failed to decode base64 string:", e);
        return "/placeholder.jpg";
      }
    } else {
      console.error("Unsupported byte array format:", typeof byteArray);
      return "/placeholder.jpg";
    }

    // Create blob with proper MIME type detection
    let mimeType = "image/jpeg";

    // Simple MIME type detection based on file signature
    if (uint8Array.length > 4) {
      const signature = Array.from(uint8Array.slice(0, 4))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (signature.startsWith("8950")) mimeType = "image/png";
      else if (signature.startsWith("4749")) mimeType = "image/gif";
      else if (signature.startsWith("ffd8")) mimeType = "image/jpeg";
      else if (signature.startsWith("5249")) mimeType = "image/webp";
    }

    const blob = new Blob([uint8Array], { type: mimeType });
    const url = URL.createObjectURL(blob);

    return url;
  } catch (error) {
    console.error("Error converting byte array to image:", error);
    return "/placeholder.jpg";
  }
};

// **NEW HELPER FUNCTION**
// Helper function to convert the new media map (Map<String, List<byte[]>>) to image URLs
const convertMediaMapToUrls = (mediaMap) => {
  if (!mediaMap || typeof mediaMap !== "object") {
    return [];
  }

  const urls = [];

  // 1. Get the main image
  const mainImages = mediaMap["PROPERTY_MEDIA_MAIN"];
  if (mainImages && Array.isArray(mainImages) && mainImages.length > 0) {
    // Add the first main image (or all, if you allow multiple main)
    urls.push(convertByteArrayToImageUrl(mainImages[0]));
  }

  // 2. Get the other images
  const otherImages = mediaMap["PROPERTY_MEDIA_OTHERS"];
  if (otherImages && Array.isArray(otherImages)) {
    otherImages.forEach((img) => {
      urls.push(convertByteArrayToImageUrl(img));
    });
  }

  // 3. Fallback: If no main/other keys are found (e.g., old data or different key)
  // try to parse all images from all lists in the map.
  if (urls.length === 0) {
    Object.values(mediaMap).forEach((imageList) => {
      if (Array.isArray(imageList)) {
        imageList.forEach((img) => {
          urls.push(convertByteArrayToImageUrl(img));
        });
      }
    });
  }

  // If still no URLs, add a placeholder
  if (urls.length === 0) {
    urls.push("/placeholder.jpg");
  }

  return urls.filter((url, index) => url !== "/placeholder.jpg" || index === 0);
};

// This function is no longer used by fetchAllProperties or fetchIndividualProperty
// const convertImagesToUrls = (images) => { ... };

const savePropertyToList = (newProperty) => {
  const existingProperties = JSON.parse(
    localStorage.getItem("userProperties") || "[]"
  );
  const updatedProperties = [...existingProperties, newProperty];
  localStorage.setItem("userProperties", JSON.stringify(updatedProperties));
  localStorage.setItem("currentPropertyId", newProperty.propertyId);
  localStorage.setItem("currentProperty", JSON.stringify(newProperty));
};

const handleAddProperty = async (propertyData) => {
  const response = await addProperty(propertyData);
  if (response && response.propertyId) {
    savePropertyToList(response);
  }
};

// Auth helper functions (Unchanged)
const getAuthTokens = () => {
  const authUser = localStorage.getItem("auth_user");
  return {
    token: localStorage.getItem("auth_token"),
    userId: localStorage.getItem("userId"),
    refreshToken: localStorage.getItem("auth_refresh_token"),
    userData: authUser ? JSON.parse(authUser) : null,
  };
};

const clearAuthTokens = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_refresh_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("userId");
};

const api = axios.create({
  baseURL: baseUrl,
  timeout: 1000000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor (Unchanged)
api.interceptors.request.use(
  (config) => {
    const { token } = getAuthTokens();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (Unchanged)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle token refresh if user was previously authenticated
    const { token, refreshToken } = getAuthTokens();
    if (error.response?.status === 401 && !originalRequest._retry && token) {
      originalRequest._retry = true;

      try {
        if (refreshToken) {
          const response = await axios.post(`${baseUrl}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          localStorage.setItem("auth_token", response.data.access_token);
          localStorage.setItem(
            "auth_refresh_token",
            response.data.refresh_token
          );

          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }

      clearAuthTokens();
      window.location.href = "/auth";
    }

    return Promise.reject(error);
  }
);

const Properties = () => {
  const [currentView, setCurrentView] = useState("featured");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minPrice: "",
    maxPrice: "",
    pincode: "",
    location: "",
    city: "",
    state: "",
    furnishing: "",
    category: "",
  });
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [isSliding, setIsSliding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthRedirect, setShowAuthRedirect] = useState(false);
  const scrollContainerRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [propertiesPerPage] = useState(6);

  const cardWidth = 374;

  // Pagination helper functions (Unchanged)
  const getPaginatedProperties = () => {
    const startIndex = (currentPage - 1) * propertiesPerPage;
    const endIndex = startIndex + propertiesPerPage;
    return filteredProperties.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredProperties.length / propertiesPerPage);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Pagination (Unchanged)
  const Pagination = () => {
    const totalPages = getTotalPages();
    const startItem = (currentPage - 1) * propertiesPerPage + 1;
    const endItem = Math.min(
      currentPage * propertiesPerPage,
      filteredProperties.length
    );

    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-white/10">
        <div className="text-white/60 text-sm">
          Showing {startItem}-{endItem} of {filteredProperties.length}{" "}
          properties
        </div>

        <div className="flex items-center gap-2">
          {/* Previous button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-all duration-300 ${
              currentPage === 1
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNumber) => {
                const shouldShow =
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1;

                const shouldShowEllipsis =
                  (pageNumber === 2 && currentPage > 4) ||
                  (pageNumber === totalPages - 1 &&
                    currentPage < totalPages - 3);

                if (!shouldShow && !shouldShowEllipsis) return null;

                if (shouldShowEllipsis) {
                  return (
                    <span key={pageNumber} className="px-2 py-1 text-white/60">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
                      currentPage === pageNumber
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              }
            )}
          </div>

          {/* Next button */}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-all duration-300 ${
              currentPage === totalPages
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // checkAuth (Unchanged)
  const checkAuth = (showError = true) => {
    const { token, userId, userData } = getAuthTokens();

    if (!token) {
      if (showError) setShowAuthRedirect(true);
      return false;
    }

    if (!userId || !userData?.userId) {
      if (showError) setShowAuthRedirect(true);
      return false;
    }

    return true;
  };

  // **UPDATED fetchIndividualProperty**
  // To parse the IndividualPropertyDetailResponse DTO
  const fetchIndividualProperty = async (propertyId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `${baseUrl}/properties/getIndividualProperty?propertyId=${propertyId}`
      );

      if (response.data) {
        // Transform the individual property data to match the expected structure
        const transformedProperty = {
          id: response.data.propertyId,
          propertyId: response.data.propertyId,
          // ownerName is not in the new DTO
          // ownerName: response.data.ownerName,
          property: {
            title: response.data.title,
            type: response.data.type,
            constructionStatus: response.data.constructionStatus,
            propertyStatus: response.data.status, // DTO has 'status'
            location: response.data.location, // DTO has 'location' (LocationResponse)
            actualPrice: response.data.actualPrice,
            discountPrice: response.data.discountPrice,
            price: response.data.actualPrice, // For backward compatibility
            description: response.data.description,
            bedrooms: response.data.bedrooms,
            bathrooms: response.data.bathrooms,
            squareFeet: response.data.areaSqft, // DTO has 'areaSqft' (String)
            furnishing: response.data.furnishing,
            amenities: response.data.amenities, // DTO has 'amenities'
            propertyFeatures: response.data.propertyFeatures, // DTO has 'propertyFeatures'
          },
          // Use the new helper and the correct DTO field 'mediaFiles'
          files: convertMediaMapToUrls(response.data.mediaFiles),
        };

        // Update localStorage with the fetched property
        localStorage.setItem(
          "currentProperty",
          JSON.stringify(transformedProperty)
        );

        return transformedProperty;
      } else {
        throw new Error("Property not found");
      }
    } catch (err) {
      console.error("Fetch individual property error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch property details"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // getIndividualProperty (Unchanged)
  const getIndividualProperty = async (propertyId = null) => {
    const targetPropertyId =
      propertyId || localStorage.getItem("currentPropertyId");

    if (!targetPropertyId) {
      setError("No property ID found");
      return null;
    }

    // First, try to get from localStorage
    const storedProperty = localStorage.getItem("currentProperty");
    if (storedProperty) {
      try {
        const parsedProperty = JSON.parse(storedProperty);
        if (parsedProperty.propertyId === targetPropertyId) {
          return parsedProperty;
        }
      } catch (e) {
        console.error("Error parsing stored property:", e);
      }
    }

    // If not found in localStorage or different property, fetch from API
    return await fetchIndividualProperty(targetPropertyId);
  };

  // **UPDATED fetchAllProperties**
  // To parse the PropertyListResponse DTO
  const fetchAllProperties = async (pincode = "") => {
    setIsLoading(true);
    setError(null);

    try {
      const url = pincode
        ? `/properties/allProperties?pincode=${pincode}`
        : `/properties/allProperties`;

      const res = await api.get(url);

      if (res.data && Array.isArray(res.data)) {
        // Transform the data to match the new DTO structure
        const transformedProperties = res.data.map((item) => ({
          id: item.propertyId, // Map propertyId to id for consistency
          propertyId: item.propertyId,
          // ownerName is not in the new DTO
          // ownerName: item.ownerName,
          property: {
            title: item.title,
            type: item.type,
            constructionStatus: item.constructionStatus,
            propertyStatus: item.propertyStatus,
            location: item.location, // DTO has 'location' (LocationResponse)
            actualPrice: item.actualPrice,
            discountPrice: item.discountPrice,
            price: item.actualPrice, // Keep for backward compatibility
          },
          // Use the new helper and the correct DTO field 'images' (which is the map)
          files: convertMediaMapToUrls(item.images),
        }));

        setAllProperties(transformedProperties);

        // Since there's no isFeatured field, we'll use the first 6 properties as featured
        setFeaturedProperties(transformedProperties.slice(0, 6));
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // **UPDATED addProperty**
  // To send files with PROPERTY_MEDIA_MAIN and PROPERTY_MEDIA_OTHERS keys
  const addProperty = async (newProperty) => {
    // newProperty format is: { property: {...}, coverImage: File, otherImages: [File, File] }

    // Check authentication before adding property
    if (!checkAuth()) {
      setShowAuthRedirect(true);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { userId, userData } = getAuthTokens();
      const ownerId = userId || userData?.userId;

      if (!ownerId) throw new Error("Authentication required");

      // Extract the property data from the form
      const propertyData = newProperty.property;

      // Transform the property data with proper type conversion
      const transformedProperty = {
        ...propertyData,
        ownerId: ownerId,
        // Convert numeric fields from strings to numbers
        actualPrice: parseFloat(propertyData.actualPrice) || 0,
        discountPrice: parseFloat(propertyData.discountPrice) || 0,
        bedrooms: parseInt(propertyData.bedrooms, 10) || 0,
        bathrooms: parseInt(propertyData.bathrooms, 10) || 0,
        areaSqft: parseInt(propertyData.areaSqft, 10) || 0,
        // Handle the location object
        location: {
          addressLine1: propertyData.location?.addressLine1 || "", // Added addressLine1
          addressLine2: propertyData.location?.addressLine2 || "",
          city: propertyData.location?.city || "",
          country: propertyData.location?.country || "",
          pincode: propertyData.location?.pincode || "",
          state: propertyData.location?.state || "",
        },
        // Ensure arrays are properly formatted
        amenities: Array.isArray(propertyData.amenities)
          ? propertyData.amenities
          : [],
        propertyFeatures: Array.isArray(propertyData.propertyFeatures)
          ? propertyData.propertyFeatures
          : [],
      };

      const formData = new FormData();
      formData.append(
        "property",
        new Blob([JSON.stringify(transformedProperty)], {
          type: "application/json",
        })
      );

      // **NEW FILE LOGIC**
      // Append the cover image with the main key
      if (newProperty.coverImage) {
        formData.append("PROPERTY_MEDIA_MAIN", newProperty.coverImage);
      } else {
        throw new Error("Cover image is required");
      }

      // Append other images with the others key
      if (newProperty.otherImages && newProperty.otherImages.length > 0) {
        newProperty.otherImages.forEach((file) => {
          formData.append("PROPERTY_MEDIA_OTHERS", file);
        });
      }
      // Note: It's okay if otherImages is empty.

      const res = await api.post("/properties/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Check multiple possible response structures
      let propertyId = null;
      let responseData = null;

      if (res.data) {
        // Try different possible structures
        if (res.data.propertyId) {
          propertyId = res.data.propertyId;
          responseData = res.data;
        } else if (res.data.data?.propertyId) {
          propertyId = res.data.data.propertyId;
          responseData = res.data.data;
        } else if (res.data.property?.propertyId) {
          propertyId = res.data.property.propertyId;
          responseData = res.data.property;
        } else if (res.data.id) {
          // Sometimes APIs return 'id' instead of 'propertyId'
          propertyId = res.data.id;
          responseData = res.data;
        } else if (typeof res.data === "string") {
          // Sometimes the response might be a string ID
          propertyId = res.data;
          responseData = { propertyId: res.data };
        }
      }

      if (propertyId) {
        localStorage.setItem("currentPropertyId", propertyId);

        // Fetch the newly created property to get all correct data
        // (since responseData might not match our transformed structure)
        await fetchIndividualProperty(propertyId);
        console.log("Property saved. Fetched new details for ID:", propertyId);

        // Refresh the property list to show the new property
        await fetchAllProperties(filters.pincode);
        return responseData; // Return the raw response from /add
      } else {
        console.error(
          "No propertyId found in response. Response structure:",
          res.data
        );
        throw new Error(
          `Property added but no ID returned. Response: ${JSON.stringify(
            res.data
          )}`
        );
      }
    } catch (err) {
      console.error("Add property error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to add property"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // handleFilterChange (Unchanged)
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // scrollToCard (Unchanged)
  const scrollToCard = (direction) => {
    if (!scrollContainerRef.current || isSliding) return;

    setIsSliding(true);
    const container = scrollContainerRef.current;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    const start = container.scrollLeft;
    const end = start + scrollAmount;
    const duration = 400;
    let startTime = null;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      container.scrollLeft = start + (end - start) * progress;
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        setIsSliding(false);
      }
    };
    requestAnimationFrame(animateScroll);
  };

  // filteredProperties (Unchanged)
  const filteredProperties =
    currentView === "featured"
      ? featuredProperties
      : allProperties.filter((item) => {
          if (!item.property) return false;

          // Search term matching (make it optional - only filter if search term exists)
          const searchMatch =
            !searchTerm ||
            item.property.title
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            item.property.location?.city
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());

          // Pincode filter
          const pincodeMatch =
            !filters.pincode ||
            item.property.location?.pincode === filters.pincode;

          // Bedroom filter - handle "4+" case
          const bedroomMatch =
            !filters.bedrooms ||
            (() => {
              const selectedBedrooms = filters.bedrooms;
              const propertyBedrooms = parseInt(item.property.bedrooms); // Ensure it's a number

              if (selectedBedrooms === "4") {
                // "4+ BHK" should show 4 or more bedrooms
                const result = propertyBedrooms >= 4;
                return result;
              } else {
                // For 1, 2, 3 - exact match
                const result = propertyBedrooms === parseInt(selectedBedrooms);
                return result;
              }
            })();

          // Property type filter
          const typeMatch =
            !filters.type || item.property.type === filters.type;

          // Price range filter
          const priceMatch =
            (!filters.minPrice ||
              item.property.actualPrice >= parseFloat(filters.minPrice)) &&
            (!filters.maxPrice ||
              item.property.actualPrice <= parseFloat(filters.maxPrice));

          // Location filters
          const cityMatch =
            !filters.city ||
            item.property.location?.city
              ?.toLowerCase()
              .includes(filters.city.toLowerCase());

          const stateMatch =
            !filters.state ||
            item.property.location?.state
              ?.toLowerCase()
              .includes(filters.state.toLowerCase());

          const finalResult =
            searchMatch &&
            bedroomMatch &&
            typeMatch &&
            priceMatch &&
            pincodeMatch &&
            cityMatch &&
            stateMatch;

          return finalResult;
        });

  useEffect(() => {
    fetchAllProperties();
  }, []);

  useEffect(() => {
    if (filters.pincode) {
      fetchAllProperties(filters.pincode);
    }
  }, [filters.pincode]);

  if (isLoading) {
    return (
      <div className="bg-black min-h-screen text-white  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading properties...</p>
        </div>
      </div>
    );
  }

  // --- RENDER (JSX) ---
  // (Unchanged except for props passed to PropertyCard/ListViewCard)
  return (
    <div className="min-h-screen text-white pt-[100px] bg-black z-10">
      {/* Header */}
      <div className="border-b border-white/10  backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                {currentView === "featured"
                  ? "Exclusive Owner Properties"
                  : "All Properties"}
                <span className="text-white/50"> in your Area</span>
              </h1>
              <p className="text-white/60 text-lg">
                {currentView === "featured"
                  ? "Handpicked premium properties directly from owners"
                  : `${allProperties.length} results | Flats for Sale in your Area`}
              </p>
            </div>
          </div>

          {showAuthRedirect && (
            <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 mb-6 text-center">
              <p className="text-yellow-200">Please login to add properties</p>
              <Link href="/auth">
                <a className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors block">
                  Go to Login
                </a>
              </Link>
            </div>
          )}

          {/* <FormProperties onAddProperty={addProperty} /> */}

          <div className="flex gap-8 mb-6">
            <button
              onClick={() => setCurrentView("featured")}
              className={`pb-3 border-b-2 transition-all duration-300 text-lg font-medium ${
                currentView === "featured"
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/30"
              }`}
            >
              Featured Properties
            </button>
            <button
              onClick={() => setCurrentView("all")}
              className={`pb-3 border-b-2 transition-all duration-300 text-lg font-medium ${
                currentView === "all"
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/30"
              }`}
            >
              All Properties ({allProperties.length})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-red-200 font-semibold mb-2">
                  Something went wrong
                </h3>
                <div className="text-red-200 text-sm mb-4 space-y-2">
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer hover:text-red-100">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono">
                      <p>This usually happens when:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>The server returns data in an unexpected format</li>
                        <li>
                          The property was created but the response format
                          changed
                        </li>
                        <li>Network issues during the request</li>
                      </ul>
                    </div>
                  </details>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setError(null);
                      fetchAllProperties(filters.pincode);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                  >
                    Refresh Properties
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm"
                  >
                    Dismiss Error
                  </button>
                  <button
                    onClick={() => {
                      fetchAllProperties(filters.pincode);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors text-sm"
                  >
                    Check if Property was Added
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      {!error && currentView === "all" && (
        <div className="border-b border-white/10  backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white placeholder-white/50 w-80 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300"
                />
              </div>
              <PropertyFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${
                    viewMode === "grid"
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${
                    viewMode === "list"
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Results count */}
              <div className="text-white/60 text-sm">
                {filteredProperties.length}{" "}
                {filteredProperties.length === 1 ? "property" : "properties"}{" "}
                found
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Listings */}
      {!error && (
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          {currentView === "featured" ? (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Premium Properties
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => scrollToCard("left")}
                    disabled={isSliding}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => scrollToCard("right")}
                    disabled={isSliding}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 items-stretch"
              >
                {featuredProperties.map((item) => (
                  <Link
                    key={item.propertyId}
                    href={`/properties/${item.propertyId}`}
                    onClick={() => {
                      localStorage.setItem(
                        "currentPropertyId",
                        item.propertyId
                      );
                      localStorage.setItem(
                        "currentProperty",
                        JSON.stringify(item)
                      );
                    }}
                  >
                    <a className="block flex-shrink-0 w-80 min-w-80">
                      <PropertyCard
                        property={item.property}
                        files={item.files}
                        // Use a fallback since ownerName is not in the DTO
                        ownerName={item.ownerName || "Owner"}
                        isSlider={true}
                      />
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-6">
              {getPaginatedProperties().map((item) => (
                <Link
                  key={item.propertyId}
                  href={`/properties/${item.propertyId}`}
                  onClick={() => {
                    localStorage.setItem("currentPropertyId", item.propertyId);
                    localStorage.setItem(
                      "currentProperty",
                      JSON.stringify(item)
                    );
                  }}
                >
                  <a>
                    <ListViewCard
                      property={item.property}
                      files={item.files}
                      // Use a fallback since ownerName is not in the DTO
                      ownerName={item.ownerName || "Owner"}
                    />
                  </a>
                </Link>
              ))}

              {/* Pagination for List View */}
              <Pagination />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getPaginatedProperties().map((item) => (
                  <Link
                    key={item.propertyId}
                    href={`/properties/${item.propertyId}`}
                    onClick={() => {
                      localStorage.setItem(
                        "currentPropertyId",
                        item.propertyId
                      );
                      localStorage.setItem(
                        "currentProperty",
                        JSON.stringify(item)
                      );
                    }}
                  >
                    <a className="block">
                      <PropertyCard
                        property={item.property}
                        files={item.files}
                        // Use a fallback since ownerName is not in the DTO
                        ownerName={item.ownerName || "Owner"}
                        isSlider={false}
                      />
                    </a>
                  </Link>
                ))}
              </div>

              {/* Pagination for Grid View */}
              <Pagination />
            </div>
          )}

          {filteredProperties.length === 0 && (
            <div className="text-center py-16">
              <Home className="w-20 h-20 mx-auto mb-6 text-white/60" />
              <p className="text-2xl mb-2 text-white/80">No properties found</p>
              <p className="text-white/60">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Properties;
