"use client"

import { useCallback, useEffect, useState } from "react"
import {
  findByName,
  getDistricts,
  getProvinces,
  getRegencies,
  getVillages,
  type WilayahItem,
} from "@/lib/api/wilayah"

// Names initially provided from backend (free-text). The hook resolves them
// to wilayah.id codes on mount so dropdowns can be initialized correctly.
export type WilayahNames = {
  province?: string | null
  city?: string | null
  district?: string | null
  subdistrict?: string | null
}

export type UseWilayahReturn = {
  provinces: WilayahItem[]
  regencies: WilayahItem[]
  districts: WilayahItem[]
  villages: WilayahItem[]

  // selected codes (null = not selected yet)
  provinceCode: string | null
  regencyCode: string | null
  districtCode: string | null
  villageCode: string | null

  // setters take a code; they cascade-clear children
  selectProvince: (code: string | null) => void
  selectRegency: (code: string | null) => void
  selectDistrict: (code: string | null) => void
  selectVillage: (code: string | null) => void

  // resolved selected items (for displaying name etc.)
  selectedProvince: WilayahItem | null
  selectedRegency: WilayahItem | null
  selectedDistrict: WilayahItem | null
  selectedVillage: WilayahItem | null

  loading: {
    provinces: boolean
    regencies: boolean
    districts: boolean
    villages: boolean
  }
}

export function useWilayah(initial: WilayahNames): UseWilayahReturn {
  const [provinces, setProvinces] = useState<WilayahItem[]>([])
  const [regencies, setRegencies] = useState<WilayahItem[]>([])
  const [districts, setDistricts] = useState<WilayahItem[]>([])
  const [villages, setVillages] = useState<WilayahItem[]>([])

  const [provinceCode, setProvinceCode] = useState<string | null>(null)
  const [regencyCode, setRegencyCode] = useState<string | null>(null)
  const [districtCode, setDistrictCode] = useState<string | null>(null)
  const [villageCode, setVillageCode] = useState<string | null>(null)

  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingVillages, setLoadingVillages] = useState(false)

  // ── Initial load: provinces + cascade-resolve names → codes ─────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoadingProvinces(true)
      try {
        const provs = await getProvinces()
        if (cancelled) return
        setProvinces(provs)

        const provItem = findByName(provs, initial.province)
        if (!provItem) return
        setProvinceCode(provItem.code)

        setLoadingRegencies(true)
        const regs = await getRegencies(provItem.code)
        if (cancelled) return
        setRegencies(regs)

        const regItem = findByName(regs, initial.city)
        if (!regItem) return
        setRegencyCode(regItem.code)

        setLoadingDistricts(true)
        const dists = await getDistricts(regItem.code)
        if (cancelled) return
        setDistricts(dists)

        const distItem = findByName(dists, initial.district)
        if (!distItem) return
        setDistrictCode(distItem.code)

        setLoadingVillages(true)
        const vills = await getVillages(distItem.code)
        if (cancelled) return
        setVillages(vills)

        const villItem = findByName(vills, initial.subdistrict)
        if (villItem) setVillageCode(villItem.code)
      } catch (err) {
        console.error("[useWilayah] init failed", err)
      } finally {
        if (!cancelled) {
          setLoadingProvinces(false)
          setLoadingRegencies(false)
          setLoadingDistricts(false)
          setLoadingVillages(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Selectors (cascade-clear children) ──────────────────────────────────
  const selectProvince = useCallback(async (code: string | null) => {
    setProvinceCode(code)
    setRegencyCode(null)
    setDistrictCode(null)
    setVillageCode(null)
    setRegencies([])
    setDistricts([])
    setVillages([])
    if (!code) return
    setLoadingRegencies(true)
    try {
      const data = await getRegencies(code)
      setRegencies(data)
    } finally {
      setLoadingRegencies(false)
    }
  }, [])

  const selectRegency = useCallback(async (code: string | null) => {
    setRegencyCode(code)
    setDistrictCode(null)
    setVillageCode(null)
    setDistricts([])
    setVillages([])
    if (!code) return
    setLoadingDistricts(true)
    try {
      const data = await getDistricts(code)
      setDistricts(data)
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  const selectDistrict = useCallback(async (code: string | null) => {
    setDistrictCode(code)
    setVillageCode(null)
    setVillages([])
    if (!code) return
    setLoadingVillages(true)
    try {
      const data = await getVillages(code)
      setVillages(data)
    } finally {
      setLoadingVillages(false)
    }
  }, [])

  const selectVillage = useCallback((code: string | null) => {
    setVillageCode(code)
  }, [])

  const selectedProvince = provinces.find((p) => p.code === provinceCode) ?? null
  const selectedRegency = regencies.find((r) => r.code === regencyCode) ?? null
  const selectedDistrict = districts.find((d) => d.code === districtCode) ?? null
  const selectedVillage = villages.find((v) => v.code === villageCode) ?? null

  return {
    provinces,
    regencies,
    districts,
    villages,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
    selectProvince,
    selectRegency,
    selectDistrict,
    selectVillage,
    selectedProvince,
    selectedRegency,
    selectedDistrict,
    selectedVillage,
    loading: {
      provinces: loadingProvinces,
      regencies: loadingRegencies,
      districts: loadingDistricts,
      villages: loadingVillages,
    },
  }
}
